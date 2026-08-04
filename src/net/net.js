// Ağ katmanı — yıldız topoloji: herkes oda sahibine bağlanır, o dağıtır.
// Koltuk atama ve oyun mantığı burada YOK; bu dosya sadece bağlantı,
// mesaj taşıma, nabız ve kopma tespitiyle ilgilenir.
MG.net = (function () {
  var A = MG.ayar;
  var peer = null;
  var hostMu = false;
  var kod = null;
  var baglar = {};      // host: koltuk -> DataConnection
  var hostBag = null;   // misafir: oda sahibine giden bağlantı
  var sonGelen = {};    // koltuk -> son mesaj zamanı (misafirde 'host' anahtarı)
  var nabizId = null, bekciId = null;

  // Kabuk bu nesneye işleyici atar:
  //   girisIstegi(conn, ad)  — host: yeni oyuncu katılmak istiyor
  //   mesaj(koltuk, veri)    — oyun/lobi mesajı geldi (misafirde koltuk=0, hep hosttan)
  //   koptu(koltuk)          — host: bir misafir düştü
  //   hostKoptu()            — misafir: oda sahibi düştü
  var olay = {};

  function iceServersAl() {
    var t = A.net.turn;
    var srv = A.net.stun.map(function (u) { return { urls: u }; });
    // Bazı ağlar sadece 443/TCP'ye izin verir — adresleri hep birlikte dene.
    srv.push({
      urls: [
        'turn:' + t.host + ':80',
        'turn:' + t.host + ':80?transport=tcp',
        'turn:' + t.host + ':443',
        'turns:' + t.host + ':443?transport=tcp'
      ],
      username: t.username,
      credential: t.credential
    });
    return srv;
  }

  // PeerJS tembel yüklenir — "Oda kur"a basılana kadar indirilmez,
  // böylece sayfa internetsiz de açılır.
  function peerjsYukle(tamam, hata) {
    if (window.Peer) return tamam();
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = function () { tamam(); };
    s.onerror = function () { hata('PeerJS yüklenemedi — internet bağlantısı var mı?'); };
    document.head.appendChild(s);
  }

  function kodUret() {
    var s = '';
    for (var i = 0; i < 4; i++) {
      s += A.net.alfabe[Math.floor(Math.random() * A.net.alfabe.length)];
    }
    return s;
  }

  // Her denemeden önce eski peer yok edilir — önce "Oda kur"a sonra
  // "Katıl"a basılırsa eski peer ayakta kalır ve bağlantı katmanı bozulur.
  function sifirla() {
    if (nabizId) { clearInterval(nabizId); nabizId = null; }
    if (bekciId) { clearInterval(bekciId); bekciId = null; }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    peer = null; hostBag = null; baglar = {}; sonGelen = {}; kod = null;
  }

  function odaKur(bitti) {
    sifirla();
    hostMu = true;
    peerjsYukle(function () { odaDene(0, bitti); }, function (m) { bitti(m); });
  }

  function odaDene(deneme, bitti) {
    if (deneme > 8) return bitti('Boş oda kodu bulunamadı, tekrar dene.');
    var k = kodUret();
    var p = new Peer(A.net.onek + k, { config: { iceServers: iceServersAl() } });
    var acildi = false;
    p.on('open', function () {
      acildi = true;
      peer = p; kod = k;
      p.on('connection', yeniBaglanti);
      nabizBaslat(); bekciBaslat();
      bitti(null, k);
    });
    p.on('error', function (e) {
      if (acildi) return; // oda kurulduktan sonraki hatalar bağlantı bazında ele alınır
      try { p.destroy(); } catch (err) {}
      if (e.type === 'unavailable-id') odaDene(deneme + 1, bitti); // kod tutulmuş, yenisini dene
      else bitti('Bağlantı hatası: ' + e.type);
    });
  }

  function yeniBaglanti(conn) {
    conn.on('data', function (d) {
      if (!d || !d.t) return;
      var koltuk = conn._mgKoltuk;
      if (koltuk != null) sonGelen[koltuk] = Date.now();
      if (d.t === 'giris' && koltuk == null) {
        if (olay.girisIstegi) olay.girisIstegi(conn, ('' + (d.ad || 'Oyuncu')).slice(0, 12));
      } else if (koltuk != null && d.t !== 'nabiz') {
        if (olay.mesaj) olay.mesaj(koltuk, d);
      }
    });
    conn.on('close', function () { dusur(conn); });
    conn.on('error', function () { dusur(conn); });
  }

  // Kabuk koltuk atadıktan sonra bağlantıyı koltuğa bağlar.
  function koltukBagla(conn, koltuk) {
    conn._mgKoltuk = koltuk;
    baglar[koltuk] = conn;
    sonGelen[koltuk] = Date.now();
  }

  function dusur(conn) {
    var koltuk = conn._mgKoltuk;
    if (koltuk == null) return;
    conn._mgKoltuk = null;
    delete baglar[koltuk];
    delete sonGelen[koltuk];
    try { conn.close(); } catch (e) {}
    if (olay.koptu) olay.koptu(koltuk);
  }

  function katil(girilenKod, ad, bitti) {
    sifirla();
    hostMu = false;
    var k = ('' + girilenKod).toUpperCase().trim();
    peerjsYukle(function () {
      var p = new Peer({ config: { iceServers: iceServersAl() } });
      peer = p;
      var bittiMi = false;
      function birKez(hata, veri) {
        if (bittiMi) return;
        bittiMi = true;
        clearTimeout(zamanlayici);
        if (hata) sifirla();
        bitti(hata, veri);
      }
      // conn.on('open') hiç tetiklenmeyebilir — süre dolunca anlamlı hata ver.
      var zamanlayici = setTimeout(function () {
        birKez('Bağlanılamadı (15 sn doldu). Kod doğru mu? Bağlantı testini dene.');
      }, A.agZamanAsimiMs);
      p.on('error', function (e) {
        birKez(e.type === 'peer-unavailable'
          ? 'Oda bulunamadı: ' + k
          : 'Bağlantı hatası: ' + e.type);
      });
      p.on('open', function () {
        var c = p.connect(A.net.onek + k, { reliable: true });
        hostBag = c;
        c.on('open', function () { c.send({ t: 'giris', ad: ad }); });
        c.on('data', function (d) {
          if (!d || !d.t) return;
          sonGelen.host = Date.now();
          if (d.t === 'hosgeldin') {
            kod = k;
            nabizBaslat(); bekciBaslat();
            birKez(null, d);
          } else if (d.t === 'dolu') {
            birKez(d.sebep || 'Oda dolu.');
          } else if (d.t !== 'nabiz') {
            if (olay.mesaj) olay.mesaj(0, d);
          }
        });
        c.on('close', function () { if (olay.hostKoptu) olay.hostKoptu(); });
        c.on('error', function () { if (olay.hostKoptu) olay.hostKoptu(); });
      });
    }, function (m) { bitti(m); });
  }

  // --- nabız ve kopma tespiti ---------------------------------------------
  // WebRTC sekme kapandığını bildirmez; conn.on('close') çoğu zaman gelmez.
  // Akan mesajları nabız sayıp sessizlikte düşmüş kabul ediyoruz.

  function nabizBaslat() {
    nabizId = setInterval(function () { gonder({ t: 'nabiz' }); }, A.yayin.nabizMs);
  }

  function bekciBaslat() {
    bekciId = setInterval(function () {
      var simdi = Date.now();
      if (hostMu) {
        for (var k in baglar) {
          if (simdi - (sonGelen[k] || 0) > A.yayin.kopmaMs) dusur(baglar[k]);
        }
      } else if (sonGelen.host && simdi - sonGelen.host > A.yayin.kopmaMs) {
        if (olay.hostKoptu) olay.hostKoptu();
      }
    }, 1000);
  }

  // --- gönderim ------------------------------------------------------------

  function yayinla(o) { // host: tüm misafirlere
    for (var k in baglar) {
      var c = baglar[k];
      if (c.open) c.send(o);
    }
  }

  function gonderKoltuga(koltuk, o) {
    var c = baglar[koltuk];
    if (c && c.open) c.send(o);
  }

  function gonder(o) { // misafir: hosta; hostta yayına düşer
    if (hostMu) yayinla(o);
    else if (hostBag && hostBag.open) hostBag.send(o);
  }

  return {
    olay: olay,
    odaKur: odaKur,
    katil: katil,
    ayril: sifirla,
    yayinla: yayinla,
    gonder: gonder,
    gonderKoltuga: gonderKoltuga,
    koltukBagla: koltukBagla,
    iceServersAl: iceServersAl,
    hostMu: function () { return hostMu; },
    kodAl: function () { return kod; }
  };
})();
