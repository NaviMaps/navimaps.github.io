#!/usr/bin/env python3
# Baja las alturas del río del Delta y arma alturas.json para la app.
# Lo corre GitHub Actions cada 30 minutos (ver .github/workflows/publicar.yml).
#
# Fuentes:
#   INA (Instituto Nacional del Agua), API pública https://alerta.ina.gob.ar/a5
#     - alturas medidas cada hora (o una vez por día en las escalas de Prefectura)
#     - pronóstico de altura hora por hora para los próximos días (donde hay)
#     - niveles de alerta, evacuación y aguas bajas de cada estación
#   SHN (Servicio de Hidrografía Naval), páginas web de hidro.gov.ar
#     - pronóstico de pleamares y bajamares (corregido por viento) para San Fernando y otros puertos
#     - avisos y alertas de crecida o bajante para el Río de la Plata
#
# Si una fuente no responde, se conserva lo que había en la versión publicada (con su fecha),
# así la app nunca se queda sin datos por una falla de un rato.
#
# Uso: python3 scripts/alturas.py salida.json [url_de_la_version_publicada]
# Solo usa la biblioteca estándar de Python (no hace falta instalar nada).

import datetime as dt
import html
import json
import re
import sys
import time
import urllib.request

INA = 'https://alerta.ina.gob.ar/a5'
SHN_PRONO = 'https://www.hidro.gov.ar/oceanografia/pronostico.asp'
SHN_AVISOS = 'https://www.hidro.gov.ar/oceanografia/AACRIOPLA.asp'
UA = {'User-Agent': 'NaviMaps/1.0 (+https://navimaps.github.io)'}

# Estaciones del Delta y alrededores: id de la serie de alturas medidas en el INA.
# El nombre es el que se muestra en la app; el resto (posición, niveles, pronóstico) sale del INA.
ESTACIONES = [
    (52, 'San Fernando'),
    (49, 'Tigre'),
    (3279, 'Arroyo Carapachay'),
    (149, 'Canal Seoane'),
    (42282, 'Paraná Miní'),
    (51, 'Chaná Miní'),
    (26206, 'Carabelas'),
    (31866, 'INTA Delta (Paraná de las Palmas)'),
    (42, 'Escobar'),
    (50, 'Dique Luján'),
    (41, 'Campana'),
    (29437, 'Zárate (Paraná de las Palmas)'),
    (9442, 'Brazo Largo (Paraná Guazú)'),
    (48, 'Guazucito'),
    (44, 'Canal Nuevo'),
    (3280, 'Nueva Palmira'),
    (53, 'San Isidro'),
    (85, 'Buenos Aires'),
]

HORAS_ATRAS = 48      # alturas medidas que se guardan
HORAS_ADELANTE = 96   # pronóstico que se guarda


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def bajar(url, intentos=3, espera=5, timeout=60):
    ultimo = None
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - cualquier falla de red se reintenta
            ultimo = e
            log('  falló (%d/%d): %s' % (i + 1, intentos, str(e)[:120]))
            time.sleep(espera * (i + 1))
    raise ultimo


def bajar_json(url, **kw):
    return json.loads(bajar(url, **kw).decode('utf-8'))


def iso(t):
    return t.strftime('%Y-%m-%dT%H:%M:%SZ')


def corto(s):
    # '2026-11-13T09:45:00.000Z' -> '2026-11-13T09:45Z' (ocupa menos y se lee igual en JavaScript)
    return s[:16] + 'Z'


# ---------------------------------------------------------------- INA

def estacion_ina(sid, nombre, ahora):
    # El listado de series (no la serie suelta) es el que trae qué pronósticos tiene
    lista = bajar_json('%s/obs/puntual/series?id=%d&format=json' % (INA, sid))
    filas = lista.get('rows', []) if isinstance(lista, dict) else lista
    if not filas:
        raise ValueError('el INA no devolvió la serie %d' % sid)
    meta = filas[0]
    e = meta.get('estacion') or {}
    lng, lat = (e.get('geom') or {}).get('coordinates', [None, None])
    est = {
        'id': sid, 'n': nombre, 'lat': lat, 'lng': lng,
        'rio': (e.get('rio') or '').strip() or None,
        'fuente': e.get('propietario') or (e.get('red') or {}).get('nombre') or 'INA',
        'alerta': e.get('nivel_alerta'), 'evac': e.get('nivel_evacuacion'), 'bajas': e.get('nivel_aguas_bajas'),
        'obs': [], 'fc': [], 'fc_fecha': None,
    }
    t0 = ahora - dt.timedelta(hours=HORAS_ATRAS)
    t1 = ahora + dt.timedelta(hours=1)
    obs = bajar_json('%s/obs/puntual/series/%d/observaciones?timestart=%s&timeend=%s&format=json'
                     % (INA, sid, iso(t0), iso(t1)))
    if isinstance(obs, dict):
        obs = obs.get('rows', [])
    est['obs'] = [[corto(o['timestart']), round(float(o['valor']), 2)]
                  for o in sorted(obs, key=lambda o: o['timestart']) if o.get('valor') is not None]

    # Pronóstico: la serie medida dice qué modelo (cal_id) y qué serie simulada lo tienen
    for p in (meta.get('pronosticos') or [])[:1]:
        try:
            run = bajar_json('%s/sim/calibrados/%d/corridas/last?series_id=%d&format=json&includeProno=true&qualifier=main'
                             % (INA, p['cal_id'], p['series_id']), timeout=120)
            ser = (run.get('series') or [{}])[0]
            desde = iso(ahora - dt.timedelta(hours=6))
            hasta = iso(ahora + dt.timedelta(hours=HORAS_ADELANTE))
            est['fc'] = [[corto(x['timestart']), round(float(x['valor']), 2)]
                         for x in ser.get('pronosticos', [])
                         if x.get('valor') is not None and desde <= x['timestart'][:19] + 'Z' <= hasta]
            est['fc_fecha'] = run.get('forecast_date')
        except Exception as ex:  # noqa: BLE001 - sin pronóstico la estación igual sirve
            log('  sin pronóstico para %s: %s' % (nombre, str(ex)[:120]))
    return est


# ---------------------------------------------------------------- SHN

def texto_html(b):
    t = b.decode('utf-8', errors='replace')
    t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', t, flags=re.S | re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


MAREA = r'(PLEAMAR|BAJAMAR)\s+(\d{1,2}:\d{2})\s+(-?\d+(?:[.,]\d+)?)\s+(\d{2}/\d{2}/\d{4})'


def pronostico_shn():
    t = texto_html(bajar(SHN_PRONO))
    i = t.find('FECHA:')
    j = t.find('Sección Pronóstico')
    if i < 0:
        raise ValueError('no encontré el pronóstico en la página del SHN')
    t = t[i:j if j > i else None]
    sal = {'texto': t}
    m = re.search(r'VALIDO DESDE (.*?) HASTA (.*?)(?= RIO| R[IÍ]O)', t)
    if m:
        sal['valido'] = 'Desde %s hasta %s' % (m.group(1).strip(), m.group(2).strip())
    m = re.search(r'R[IÍ]O DE LA PLATA INTERIOR:.*?Mart[ií]n Garc[ií]a\.\s*(.*?)\s*Valores corregidos', t)
    if m:
        sal['correccion'] = m.group(1).strip().rstrip('-').strip()
    m = re.search(r'PERSPECTIVAS.*?:\s*R[ií]o de la Plata Interior\s*(.*?)\s*R[ií]o de la Plata Exterior', t, flags=re.I)
    if m:
        sal['perspectivas'] = m.group(1).strip().rstrip('-').strip()
    # Pleamares y bajamares de San Fernando (están entre "SAN FERNANDO" y la sección siguiente)
    m = re.search(r'SAN FERNANDO\s+(.*?)(?=R[IÍ]O DE LA PLATA EXTERIOR|PERSPECTIVAS|$)', t)
    mareas = []
    if m:
        for est, hora, alt, fecha in re.findall(MAREA, m.group(1)):
            d, mes, a = fecha.split('/')
            mareas.append({'tipo': est.lower(), 't': '%s-%s-%sT%s' % (a, mes, d, hora.zfill(5)),
                           'h': float(alt.replace(',', '.'))})
    sal['san_fernando'] = mareas
    return sal


def avisos_shn():
    t = texto_html(bajar(SHN_AVISOS))
    if re.search(r'NO HAY NING[UÚ]N AVISO', t, flags=re.I):
        return None
    i = t.find('Compartir en redes sociales')
    j = t.find('Follow @SHN')
    cuerpo = t[i + len('Compartir en redes sociales'):j if j > i else None].strip() if i >= 0 else t[:800]
    return cuerpo[:1500] or None


# ---------------------------------------------------------------- armado

def anterior(url):
    if not url:
        return {}
    try:
        return bajar_json(url, intentos=2, timeout=30)
    except Exception as e:  # noqa: BLE001
        log('No pude leer la versión publicada (%s): %s' % (url, str(e)[:120]))
        return {}


def main():
    salida = sys.argv[1] if len(sys.argv) > 1 else 'alturas.json'
    viejo = anterior(sys.argv[2] if len(sys.argv) > 2 else None)
    viejas = {e['id']: e for e in viejo.get('estaciones', [])}
    ahora = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    datos = {'actualizado': iso(ahora), 'estaciones': [], 'shn': viejo.get('shn')}
    ok = 0

    for sid, nombre in ESTACIONES:
        log('INA %s (%d)' % (nombre, sid))
        try:
            datos['estaciones'].append(estacion_ina(sid, nombre, ahora))
            ok += 1
        except Exception as e:  # noqa: BLE001
            log('  no se pudo: %s' % str(e)[:160])
            if sid in viejas:
                datos['estaciones'].append(viejas[sid])
                log('  queda el dato anterior')

    log('SHN pronóstico y avisos')
    try:
        shn = pronostico_shn()
        shn['actualizado'] = iso(ahora)
        try:
            shn['aviso'] = avisos_shn()
        except Exception as e:  # noqa: BLE001
            log('  avisos: %s' % str(e)[:160])
            shn['aviso'] = (viejo.get('shn') or {}).get('aviso')
        datos['shn'] = shn
    except Exception as e:  # noqa: BLE001
        log('  pronóstico: %s (queda el anterior)' % str(e)[:160])

    if not ok and not datos['estaciones']:
        log('No se pudo bajar ninguna estación y no hay datos anteriores.')
        sys.exit(1)

    with open(salida, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, separators=(',', ':'))
    log('Listo: %s (%d estaciones nuevas de %d, SHN %s)' %
        (salida, ok, len(ESTACIONES), 'ok' if datos.get('shn') else 'sin datos'))


if __name__ == '__main__':
    main()
