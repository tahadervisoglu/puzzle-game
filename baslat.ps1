# Tek tıkla yayın: sunucuyu başlatır, tüneli açar, tünelin yeni adresini
# config.js'e yazar ve GitHub'a gönderir.
#
# Neden betik: anonim localhost.run tünelinin adı her açılışta değişiyor.
# Elle yapıldığında üç adımdan (adresi kopyala, config'e yaz, push et) biri
# sürekli unutuluyor ve oyun sessizce eski adrese bağlanmaya çalışıyordu.
#
# -PushAtma ile çalıştırılırsa her şeyi yapar ama GitHub'a göndermez;
# betiği denemek için kullanılır.

# -DenemeSaniye verilirse izleme döngüsü o kadar saniye sonra kendiliğinden
# çıkar; betiği tuş basmadan sınamak için.
param([switch]$PushAtma, [int]$DenemeSaniye = 0)

$ErrorActionPreference = 'Stop'
$kok    = Split-Path -Parent $MyInvocation.MyCommand.Path
$port   = 8090
$sayfa  = 'https://tahadervisoglu.github.io/puzzle-game/'
$gecici = Join-Path $env:TEMP 'minigames-tunel.log'
$hataLog = Join-Path $env:TEMP 'minigames-tunel-hata.log'
$sunucuLog = Join-Path $env:TEMP 'minigames-sunucu.log'
# Anahtarla bağlanınca localhost.run hep aynı alt alan adını veriyor; anonim
# bağlantıda adres her seferinde değişiyor ve config.js'i güncelleyip yeniden
# yayına almak gerekiyordu. Anahtar admin.localhost.run hesabına ekli.
$anahtar = Join-Path $env:USERPROFILE '.ssh\id_localhostrun'

$sunucuSurec = $null
$tunelSurec  = $null

function Yaz($metin, $renk = 'Gray') { Write-Host $metin -ForegroundColor $renk }

function Baslik($metin) {
  Write-Host ''
  Write-Host "  $metin" -ForegroundColor Cyan
}

# Önceki çalıştırmadan kalan süreçler: pencere çarpı ile kapatıldığında
# temizlik yapılamıyor, o yüzden her başlangıçta ortalık siliniyor.
function EskileriTemizle {
  $b = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $b) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'localhost\.run' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function SunucuBaslat {
  # Hem sunucu hem tünel bu pencereye bağlı (-NoNewWindow) başlatılıyor:
  # pencere kapanınca ikisi birden ölsün isteniyor. Gizli başlatılan süreç
  # pencere kapansa da yaşamaya devam edip ortada zombi sunucu bırakıyordu.
  # Çıktıları dosyaya gidiyor, yoksa günlükler ekranı boğuyor.
  $script:sunucuSurec = Start-Process node `
    -ArgumentList 'sunucu/index.js' `
    -WorkingDirectory $kok `
    -RedirectStandardOutput $sunucuLog -RedirectStandardError "$sunucuLog.hata" `
    -NoNewWindow -PassThru

  # Tünel, sunucu ayağa kalkmadan bağlanırsa localhost.run bağlantıyı
  # düşürüyor. O yüzden burada gerçekten cevap verene kadar bekleniyor.
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $c = (Invoke-WebRequest "http://127.0.0.1:$port/durum" -UseBasicParsing -TimeoutSec 3).Content
      return $c
    } catch { }
  }
  throw "Sunucu $port portunda ayağa kalkmadı."
}

function TunelAc {
  Remove-Item $gecici, $hataLog -ErrorAction SilentlyContinue
  $script:tunelSurec = Start-Process ssh `
    -ArgumentList @(
      '-i', $anahtar,
      '-o', 'IdentitiesOnly=yes',   # yoksa ssh önce başka anahtarları dener
      '-o', 'StrictHostKeyChecking=accept-new',
      '-o', 'ServerAliveInterval=30',
      '-o', 'ExitOnForwardFailure=yes',
      '-R', "80:127.0.0.1:$port",
      'localhost.run'
    ) `
    -RedirectStandardOutput $gecici -RedirectStandardError $hataLog `
    -NoNewWindow -PassThru

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $metin = Get-Content $gecici -Raw -ErrorAction SilentlyContinue
    if ($metin -match '([0-9a-f]+\.lhr\.life)') { return $Matches[1] }
    if ($script:tunelSurec.HasExited) { throw 'Tünel bağlantısı düştü. İnternet bağlantını kontrol et.' }
  }
  throw 'Tünel adresi 80 saniyede gelmedi.'
}

# Adres yalnızca net.sunucu satırında geçer; dosyanın kalanına dokunulmuyor.
# BOM eklememek için .NET yazıcısı kullanılıyor, yoksa her çalıştırmada
# git diff'te gereksiz bir değişiklik çıkıyor.
function ConfigYaz($adres) {
  $yol = Join-Path $kok 'config.js'
  $icerik = [IO.File]::ReadAllText($yol)
  $yeni = [Regex]::Replace($icerik, "sunucu: 'wss://[^']*'", "sunucu: 'wss://$adres'")
  if ($yeni -eq $icerik) { return $false }
  [IO.File]::WriteAllText($yol, $yeni, (New-Object Text.UTF8Encoding $false))
  return $true
}

function Gonder($adres) {
  git -C $kok add config.js
  git -C $kok commit -m "Sunucu adresi guncellendi: $adres" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Commit basarisiz.' }
  git -C $kok push
  if ($LASTEXITCODE -ne 0) { throw 'Push basarisiz. GitHub girisini kontrol et.' }
}

# Tüneli açar, yeni adresi config'e yazar ve yayına gönderir. Tünel oyun
# ortasında da düşebildiği için bu iş tek seferlik değil, tekrarlanabilir.
function Yayinla {
  $adres = TunelAc
  Yaz "  Adres: $adres" 'Green'
  $degisti = ConfigYaz $adres
  if (-not $degisti) {
    Yaz '  Adres zaten ayni, degisiklik yok.' 'DarkGray'
  } elseif ($PushAtma) {
    Yaz '  config.js guncellendi. (-PushAtma verildigi icin gonderilmedi)' 'Yellow'
  } else {
    Gonder $adres
    Yaz '  config.js guncellendi ve GitHub a gonderildi.' 'Green'
  }
  return $adres
}

# ssh süreci ayakta olsa bile localhost.run tüneli düşürebiliyor ("no tunnel
# here" dönüyor), o yüzden süreci yoklamak yetmiyor; dışarıdan sorulur.
function TunelSaglamMi($adres) {
  try {
    Invoke-WebRequest "https://$adres/durum" -UseBasicParsing -TimeoutSec 12 | Out-Null
    return $true
  } catch { return $false }
}

function EnterBasildiMi {
  try {
    if ([Console]::KeyAvailable) { return ([Console]::ReadKey($true).Key -eq 'Enter') }
  } catch { }   # girdi yönlendirilmişse (betik testi) tuş okunamaz
  return $false
}

function Temizle {
  Baslik 'Kapatiliyor...'
  foreach ($s in @($script:tunelSurec, $script:sunucuSurec)) {
    if ($s -and -not $s.HasExited) { Stop-Process -Id $s.Id -Force -ErrorAction SilentlyContinue }
  }
  Yaz '  Sunucu ve tunel durduruldu. Oyun artik calismiyor.' 'DarkGray'
}

# --- akış --------------------------------------------------------------------

try {
  Clear-Host
  Write-Host ''
  Write-Host '  MINIGAMES SUNUCU' -ForegroundColor White
  Write-Host '  ================' -ForegroundColor DarkGray

  Baslik '1/4  Eski surecler temizleniyor'
  EskileriTemizle
  Yaz '  Tamam.' 'Green'

  Baslik '2/4  Sunucu baslatiliyor'
  $durum = SunucuBaslat
  Yaz "  Tamam. $durum" 'Green'

  Baslik '3/4  Tunel aciliyor (10-20 saniye surebilir)'
  Baslik '4/4  Adres oyuna yaziliyor'
  $adres = Yayinla

  Write-Host ''
  Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
  Write-Host '  HAZIR!' -ForegroundColor Green
  Write-Host ''
  Write-Host "  Arkadaslarina bu adresi ver:  $sayfa" -ForegroundColor White
  if (-not $PushAtma) {
    Write-Host '  (GitHub sayfayi yenilemesi ~1 dakika surer, hemen acilmazsa bekle)' -ForegroundColor DarkGray
  }
  Write-Host ''
  Write-Host '  Bitirince bu pencereyi kapat; sunucu ve tunel de kapanir.' -ForegroundColor Yellow
  Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkGray
  Write-Host ''

  if (-not $PushAtma) { Start-Process $sayfa }

  # Tünel oyun ortasında kendiliğinden de düşebiliyor. Düşerse yeni adres alıp
  # yayını tazelemek gerekiyor; yoksa oyun ölü adrese bağlanmaya çalışır ve
  # kimse sebebini anlamaz.
  Yaz '  Tunel izleniyor. Bitirmek icin Enter a bas veya pencereyi kapat.' 'DarkGray'
  $gecen = 0
  while ($true) {
    Start-Sleep -Seconds 2
    if (EnterBasildiMi) { break }
    if ($DenemeSaniye -gt 0 -and $gecen -ge $DenemeSaniye) { break }
    $gecen += 2

    # Süreç yoklaması ucuz, her turda; dışarıdan sağlık sorgusu pahalı, seyrek.
    $dustu = $tunelSurec.HasExited
    if (-not $dustu -and ($gecen % 60) -eq 0) { $dustu = -not (TunelSaglamMi $adres) }
    if (-not $dustu) { continue }

    Write-Host ''
    Yaz '  Tunel dustu, yeniden kuruluyor...' 'Yellow'
    if (-not $tunelSurec.HasExited) {
      Stop-Process -Id $tunelSurec.Id -Force -ErrorAction SilentlyContinue
    }
    try {
      $adres = Yayinla
      Yaz '  Duzeldi. Arkadaslarin sayfayi yenilesin.' 'Green'
    } catch {
      Yaz "  Yeniden kurulamadi: $($_.Exception.Message)" 'Red'
      Start-Sleep -Seconds 10
    }
  }
}
catch {
  Write-Host ''
  Write-Host "  HATA: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ''
  Read-Host '  Kapatmak icin Enter a bas'
}
finally {
  Temizle
}
