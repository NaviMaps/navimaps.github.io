# Descarga los cauces del Delta desde OpenStreetMap en 6 partes y arma cauces.json
# Uso:  powershell -ExecutionPolicy Bypass -File .\descargar-cauces.ps1

$servidores = @(
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
)

# Rectangulo del Delta (sur, oeste, norte, este) dividido en filas x columnas
$sur = -34.50; $norte = -33.90; $oeste = -59.00; $este = -58.35
$filas = 2; $cols = 3

$ci = [Globalization.CultureInfo]::InvariantCulture
$partes = @()
for ($i = 0; $i -lt $filas; $i++) {
  for ($j = 0; $j -lt $cols; $j++) {
    $s = $sur + ($norte - $sur) / $filas * $i
    $n = $sur + ($norte - $sur) / $filas * ($i + 1)
    $w = $oeste + ($este - $oeste) / $cols * $j
    $e = $oeste + ($este - $oeste) / $cols * ($j + 1)
    $caja = ($s.ToString('F4', $ci), $w.ToString('F4', $ci), $n.ToString('F4', $ci), $e.ToString('F4', $ci)) -join ','
    $partes += $caja
  }
}

function Extraer-Elementos($texto) {
  $k = $texto.IndexOf('"elements"')
  if ($k -lt 0) { return $null }
  $a = $texto.IndexOf('[', $k)
  $b = $texto.LastIndexOf(']')
  if ($a -lt 0 -or $b -le $a) { return $null }
  return $texto.Substring($a + 1, $b - $a - 1).Trim()
}

$tmp = Join-Path $env:TEMP 'cauces_parte.json'
$trozos = @()
$num = 0

foreach ($caja in $partes) {
  $num++
  $q = '[out:json][timeout:120];way["waterway"~"^(river|canal|stream|tidal_channel)$"](' + $caja + ');out geom;'
  $ok = $false

  for ($intento = 1; ($intento -le 6) -and (-not $ok); $intento++) {
    foreach ($srv in $servidores) {
      if ($ok) { break }
      Write-Host ("Parte {0} de {1} - intento {2} - {3}" -f $num, $partes.Count, $intento, $srv)
      try {
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
        Invoke-WebRequest -Uri $srv -Method POST -UserAgent 'MapaDelta/1.0' `
          -ContentType 'application/x-www-form-urlencoded' `
          -Body ('data=' + [uri]::EscapeDataString($q)) `
          -UseBasicParsing -TimeoutSec 300 -OutFile $tmp
        $txt = [IO.File]::ReadAllText($tmp, [Text.Encoding]::UTF8)
        if ($txt -notmatch '"remark"') {
          $el = Extraer-Elementos $txt
          if ($null -ne $el) {
            if ($el.Length -gt 0) { $trozos += $el }
            $ok = $true
            Write-Host ("  OK ({0} MB)" -f [math]::Round($txt.Length / 1MB, 1)) -ForegroundColor Green
          } else {
            Write-Host '  Respuesta vacia o incompleta' -ForegroundColor Yellow
          }
        } else {
          Write-Host '  El servidor no pudo completar la consulta' -ForegroundColor Yellow
        }
      } catch {
        $msg = $_.Exception.Message
        if ($msg.Length -gt 90) { $msg = $msg.Substring(0, 90) }
        Write-Host ("  Fallo: " + $msg) -ForegroundColor Yellow
      }
    }
    if (-not $ok) {
      $espera = [math]::Min(60, 5 * [math]::Pow(2, $intento - 1))
      Write-Host ("  Esperando {0} segundos antes de reintentar..." -f $espera)
      Start-Sleep -Seconds $espera
    }
  }

  if (-not $ok) {
    Write-Host ("No se pudo bajar la parte {0}. Proba de nuevo mas tarde." -f $num) -ForegroundColor Red
    exit 1
  }
  Start-Sleep -Seconds 3
}

$salida = Join-Path $PWD.Path 'cauces.json'
$json = '{"elements":[' + ($trozos -join ',') + ']}'
[IO.File]::WriteAllText($salida, $json, (New-Object System.Text.UTF8Encoding($false)))
$mb = [math]::Round((Get-Item $salida).Length / 1MB, 1)
Write-Host ''
Write-Host ("Listo: {0} ({1} MB)" -f $salida, $mb) -ForegroundColor Green
if ($mb -gt 24) {
  Write-Host 'Pesa mas de 25 MB: GitHub no deja subirlo desde el navegador. Achica el rectangulo y repeti.' -ForegroundColor Yellow
}
