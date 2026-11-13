# Descarga los lugares del Delta desde OpenStreetMap y arma lugares.json
# (estaciones de servicio, restaurantes, bares, marinas y muelles, proveedurias, alojamiento y salud)
# Uso:  powershell -ExecutionPolicy Bypass -File .\descargar-lugares.ps1

$servidores = @(
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
)

# Mismo rectangulo que los cauces (sur, oeste, norte, este), dividido en filas x columnas.
# Igual que descargar-cauces.ps1: se baja en 6 partes chicas, asi el servidor responde aunque este cargado.
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
    $partes += (($s.ToString('F4', $ci), $w.ToString('F4', $ci), $n.ToString('F4', $ci), $e.ToString('F4', $ci)) -join ',')
  }
}

# Se pide en formato de texto separado por tabulaciones: ocupa mucho menos que el JSON completo
function Consulta($caja) {
  return '[out:csv(::type,::id,::lat,::lon,name,amenity,leisure,tourism,shop,man_made,waterway,boat;true;"\t")][timeout:120][bbox:' + $caja + '];(' +
    'nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|ice_cream|fuel|pharmacy|hospital|clinic)$"];' +
    'nwr["waterway"~"^(fuel|boatyard)$"];' +
    'nwr["leisure"="marina"];' +
    'nwr["man_made"="pier"]["name"];' +
    'nwr["shop"~"^(supermarket|convenience|general)$"];' +
    'nwr["tourism"~"^(hotel|guest_house|chalet|hostel|camp_site|motel)$"];' +
    ');out center;'
}

$tmp = Join-Path $env:TEMP 'lugares_parte.txt'
$lineas = @()
$num = 0

foreach ($caja in $partes) {
  $num++
  $q = Consulta $caja
  $ok = $false

  for ($intento = 1; ($intento -le 6) -and (-not $ok); $intento++) {
    foreach ($srv in $servidores) {
      if ($ok) { break }
      Write-Host ("Parte {0} de {1} - intento {2} - {3}" -f $num, $partes.Count, $intento, $srv)
      try {
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
        Invoke-WebRequest -Uri $srv -Method POST -UserAgent 'NaviMaps/1.0' `
          -ContentType 'application/x-www-form-urlencoded' `
          -Body ('data=' + [uri]::EscapeDataString($q)) `
          -UseBasicParsing -TimeoutSec 300 -OutFile $tmp
        $t = [IO.File]::ReadAllText($tmp, [Text.Encoding]::UTF8)
        if ($t.StartsWith('@type')) {
          $filasParte = $t -split "`n" | Select-Object -Skip 1
          $lineas += $filasParte
          $ok = $true
          Write-Host ("  OK ({0} filas)" -f @($filasParte | Where-Object { $_.Trim() -ne '' }).Count) -ForegroundColor Green
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

# Columnas: 0 tipo, 1 id, 2 lat, 3 lon, 4 name, 5 amenity, 6 leisure, 7 tourism, 8 shop, 9 man_made, 10 waterway, 11 boat
# Sin nombre solo se guardan los que sirven igual: combustible, marinas y hospitales
$sinNombreOk = @('fuel', 'marina', 'hospital')
$lista = New-Object System.Collections.ArrayList
$vistos = @{}
# Un lugar que cae justo en el borde entre dos partes viene dos veces: $vistos lo deja una sola vez
foreach ($linea in $lineas) {
  $f = $linea.TrimEnd("`r").Split("`t")
  if ($f.Length -lt 12 -or $f[2] -eq '' -or $f[3] -eq '') { continue }
  $clave = $f[0] + $f[1]
  if ($vistos.ContainsKey($clave)) { continue }
  $vistos[$clave] = 1

  $k = ''
  if ($f[10] -eq 'fuel') { $k = 'fuel' }
  foreach ($c in @(5, 10, 6, 7, 8, 9)) { if ($k -eq '' -and $f[$c] -ne '') { $k = $f[$c] } }
  $nombre = $f[4].Trim()
  if ($nombre -eq '' -and $sinNombreOk -notcontains $k) { continue }

  $o = [ordered]@{
    n  = $nombre
    k  = $k
    la = [math]::Round([double]::Parse($f[2], $ci), 6)
    lo = [math]::Round([double]::Parse($f[3], $ci), 6)
  }
  # Combustible para lanchas (en el agua)
  if ($k -eq 'fuel' -and ($f[10] -eq 'fuel' -or $f[11] -eq 'yes')) { $o.b = 1 }
  [void]$lista.Add($o)
}

$json = ConvertTo-Json -InputObject @($lista) -Compress -Depth 3
$salida = Join-Path $PWD.Path 'lugares.json'
$todo = '{"fecha":"' + (Get-Date -Format 'yyyy-MM-dd') + '","lugares":' + $json + '}'
[IO.File]::WriteAllText($salida, $todo, (New-Object System.Text.UTF8Encoding($false)))

$porTipo = $lista | Group-Object { $_.k } | Sort-Object Count -Descending | ForEach-Object { '{0} {1}' -f $_.Count, $_.Name }
Write-Host ''
Write-Host ("Listo: {0} ({1} lugares, {2} KB)" -f $salida, $lista.Count, [math]::Round((Get-Item $salida).Length / 1KB)) -ForegroundColor Green
Write-Host ('Por tipo: ' + ($porTipo -join ', '))
Write-Host 'Acordate de subir la VERSION en sw.js antes de hacer commit.'
