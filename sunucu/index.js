// Minigames sunucusu: WebSocket bağlantıları, otomatik eşleşme ve 60 Hz
// oyun döngüsü.
//
// Otorite burada. Oyuncular yalnızca tuş girdisi gönderiyor, dünyayı sunucu
// işletip herkese aynı durumu yayınlıyor — böylece kimsenin "oda sahibi
// olduğu için avantajlı" olması mümkün değil.
const http = require('http');
const WebSocket = require('ws');
const { Oda, MG } = require('./oda');

const PORT = process.env.PORT || 8090;
const ADIM_MS = 1000 / 60;
const BOS_ODA_OMRU_MS = 60 * 1000;   // kimse kalmayan oda bu süre sonra silinir

const odalar = [];

// Açık lobisi olan ilk odaya koy, yoksa yeni oda aç. İstemcinin kod
// girmesine gerek kalmamasının sebebi bu.
function odaBul() {
  for (var i = 0; i < odalar.length; i++) {
    var o = odalar[i];
    if (o.evre === 'lobi' && o.bosKoltuk() >= 0) return o;
  }
  var yeni = new Oda();
  odalar.push(yeni);
  return yeni;
}

const sunucu = http.createServer(function (istek, cevap) {
  // Render'ın sağlık kontrolü ve elle bakmak için basit bir durum ucu
  if (istek.url === '/durum' || istek.url === '/') {
    cevap.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    cevap.end(JSON.stringify({
      durum: 'çalışıyor',
      oyunSayisi: Object.keys(MG.oyunlar).length,
      oda: odalar.length,
      oyuncu: odalar.reduce(function (t, o) { return t + o.insanSayisi(); }, 0)
    }));
    return;
  }
  cevap.writeHead(404);
  cevap.end();
});

const wss = new WebSocket.Server({ server: sunucu });

wss.on('connection', function (baglanti) {
  var oda = null;
  var koltuk = -1;
  baglanti.isAlive = true;
  baglanti.on('pong', function () { baglanti.isAlive = true; });

  baglanti.on('message', function (ham) {
    var m;
    try { m = JSON.parse(ham); } catch (e) { return; }
    if (!m || !m.t) return;

    if (m.t === 'katil') {
      if (oda) return;
      var ad = ('' + (m.ad || 'Oyuncu')).slice(0, 12);
      // Uygun oda bulunana kadar dene: araya biri girip odayı doldurmuş olabilir
      for (var deneme = 0; deneme < 5; deneme++) {
        var aday = odaBul();
        var sonuc = aday.katil(baglanti, ad);
        if (sonuc.koltuk != null) {
          oda = aday;
          koltuk = sonuc.koltuk;
          return;
        }
      }
      baglanti.send(JSON.stringify({ t: 'dolu', sebep: 'Şu an yer yok, tekrar dene.' }));
      return;
    }

    // Gidiş-dönüş ölçümü: istemci kendi saatini yollar, aynen geri döner.
    // İstemci bunu gecikme gizlemede kullanıyor (src/core/tahmin.js) —
    // sunucunun saatiyle karşılaştırma yapılmadığı için saatlerin uyumlu
    // olması gerekmiyor.
    if (m.t === 'yanki') {
      baglanti.send(JSON.stringify({ t: 'yanki', z: m.z }));
      return;
    }

    if (!oda || koltuk < 0) return;

    if (m.t === 'girdi') oda.girdi(koltuk, m.k, !!m.b);
    else if (m.t === 'ayar') oda.ayarla(koltuk, m.turSayisi, m.secilenOyun);
    else if (m.t === 'bot') oda.botEkle(koltuk);
    else if (m.t === 'botSil') oda.botSil(koltuk, m.koltuk);
    else if (m.t === 'basla') oda.baslat(koltuk);
    else if (m.t === 'ayril') {
      oda.ayril(koltuk);
      oda = null; koltuk = -1;
    }
  });

  baglanti.on('close', function () {
    if (oda && koltuk >= 0) oda.ayril(koltuk);
    oda = null; koltuk = -1;
  });

  baglanti.on('error', function () { /* close zaten tetiklenir */ });
});

// --- ana döngü -------------------------------------------------------------
// Tek bir zamanlayıcı bütün odaları sürüyor: oda başına interval açmak
// gereksiz yük ve zamanlama sapması demek.

var sonZaman = Date.now();
setInterval(function () {
  var simdi = Date.now();
  var dt = Math.min(0.1, (simdi - sonZaman) / 1000);
  sonZaman = simdi;

  for (var i = odalar.length - 1; i >= 0; i--) {
    var oda = odalar[i];
    try {
      oda.adim(dt);
    } catch (e) {
      // Bir odadaki hata bütün sunucuyu düşürmesin
      console.error('Oda ' + oda.no + ' hatası:', e && e.message);
      oda.lobiyeDon();
    }
    // Boşalan odayı bir süre bekletip kapat
    if (oda.insanSayisi() === 0 && simdi - oda.sonEtkinlik > BOS_ODA_OMRU_MS) {
      oda.zamanlayiciTemizle();
      odalar.splice(i, 1);
    }
  }
}, ADIM_MS);

// Kopan ama kapanmayan bağlantıları temizle (WebSocket bunu kendi bildirmez)
setInterval(function () {
  wss.clients.forEach(function (c) {
    if (c.isAlive === false) return c.terminate();
    c.isAlive = false;
    try { c.ping(); } catch (e) { /* yoksay */ }
  });
}, 30000);

sunucu.listen(PORT, '0.0.0.0', function () {
  console.log('Minigames sunucusu ' + PORT + ' portunda, ' +
              Object.keys(MG.oyunlar).length + ' oyun yüklü');
});
