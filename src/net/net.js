// Ağ katmanı — sunucuya WebSocket bağlantısı.
//
// Önce PeerJS ile eşler arası bağlanıyorduk ve oyunculardan biri "oda sahibi"
// olarak dünyayı simüle ediyordu; o kişinin girdi gecikmesi sıfır, ötekilerin
// bir gidiş-dönüş kadardı. Artık otorite sunucuda: herkes eşit mesafede.
// Yan kazanç, TURN aktarıcısına hiç ihtiyaç kalmaması — bağlanamama sorunu
// da bitiyor.
MG.net = (function () {
  var A = MG.ayar;
  var soket = null;
  var benKoltuk = -1;
  var sahipKoltuk = -1;
  var baglandi = false;

  // Kabuk bu nesneye işleyici atar:
  //   mesaj(veri)   — sunucudan oyun/lobi mesajı geldi
  //   koptu(sebep)  — bağlantı düştü
  var olay = {};

  function sunucuAdresi() {
    // Yerelde geliştirirken aynı makinedeki sunucuya bağlan; yayında
    // config'deki adrese. Karar burada veriliyor çünkü config.js sunucu
    // tarafında da yükleniyor ve orada `location` yok.
    var yerel = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!yerel && A.net.sunucu) return A.net.sunucu;
    var protokol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return protokol + '//' + location.hostname + ':8090';
  }

  function baglan(ad, bitti) {
    ayril();
    var adres = sunucuAdresi();
    var bittiMi = false;
    function birKez(hata, veri) {
      if (bittiMi) return;
      bittiMi = true;
      clearTimeout(zaman);
      bitti(hata, veri);
    }

    // Sunucu uykudaysa (ücretsiz barındırma) uyanması bir dakikayı bulabilir
    var zaman = setTimeout(function () {
      birKez('Sunucuya ulaşılamadı. Uyanıyor olabilir, biraz sonra dene.');
    }, A.net.baglantiZamanAsimiMs);

    try {
      soket = new WebSocket(adres);
    } catch (e) {
      return birKez('Bağlantı kurulamadı: ' + e.message);
    }

    soket.onopen = function () {
      baglandi = true;
      soket.send(JSON.stringify({ t: 'katil', ad: ad }));
    };

    soket.onmessage = function (ev) {
      var d;
      try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (!d || !d.t) return;

      if (d.t === 'hosgeldin') {
        benKoltuk = d.koltuk;
        sahipKoltuk = d.sahip;
        return birKez(null, d);
      }
      if (d.t === 'dolu') return birKez(d.sebep || 'Oda dolu.');
      if (d.sahip != null) sahipKoltuk = d.sahip;
      if (olay.mesaj) olay.mesaj(d);
    };

    soket.onclose = function () {
      baglandi = false;
      if (!bittiMi) return birKez('Sunucu bağlantısı kurulamadı.');
      if (olay.koptu) olay.koptu();
    };

    soket.onerror = function () {
      if (!bittiMi) birKez('Sunucuya bağlanılamadı: ' + adres);
    };
  }

  function gonder(o) {
    if (!soket || soket.readyState !== 1) return;
    try { soket.send(JSON.stringify(o)); } catch (e) { /* yoksay */ }
  }

  function ayril() {
    if (soket) {
      try {
        if (soket.readyState === 1) soket.send(JSON.stringify({ t: 'ayril' }));
        soket.onclose = null;
        soket.close();
      } catch (e) { /* yoksay */ }
    }
    soket = null;
    baglandi = false;
    benKoltuk = -1;
    sahipKoltuk = -1;
  }

  return {
    olay: olay,
    baglan: baglan,
    gonder: gonder,
    ayril: ayril,
    benKoltukAl: function () { return benKoltuk; },
    // Oda sahipliği yalnızca lobi kararları için: kim başlatır, kim bot ekler.
    // Oyun otoritesiyle ilgisi yok, o tamamen sunucuda.
    sahipMiyim: function () { return benKoltuk >= 0 && benKoltuk === sahipKoltuk; },
    bagliMi: function () { return baglandi; }
  };
})();
