// Tur akışı, girdi yönlendirme, ana döngü ve ağ olaylarının bağlanması.
MG.tur = (function () {
  var A = MG.ayar;
  var O = MG.oturum;
  var U = MG.ui;

  var sayimKalan = 0, sonSayimTik = -1;
  var yayinBirikim = 0, ustBarSayac = 0;
  var sonrakiTur = null;
  var basiliTuslar = {};

  // --- tur akışı -----------------------------------------------------------

  function baslat() { // sadece oda sahibi
    var tohum = (Math.random() * 0xFFFFFFFF) >>> 0;
    MG.net.yayinla({
      t: 'basla', tohum: tohum, oyun: O.secilenOyun,
      koltuklar: O.koltukOzet(), skorlar: O.skorlar
    });
    yerelBasla(tohum, O.secilenOyun);
  }

  function yerelBasla(tohum, oyunId) {
    durdur();
    O.oyun = MG.oyunlar[oyunId] || MG.oyunlar.tank;
    O.oyunDurum = O.oyun.kur(tohum, O.koltuklar);
    O.evre = 'sayim';
    sayimKalan = A.tur.geriSayimSn;
    sonSayimTik = -1;
    yayinBirikim = 0;
    U.ekranGoster('ekranOyun');
    U.boyutlandir();
    U.$('btnLobiyeDon').classList.toggle('gizli', !MG.net.hostMu());
    U.ustBarYenile();
    tuslariTazele();
  }

  // Tur başında basılı tutulan tuşları yeniden bildir — oyun durumu sıfırdan
  // kurulduğu için "değişince gönder" mantığı bunları kaçırır.
  function tuslariTazele() {
    for (var tus in basiliTuslar) {
      if (basiliTuslar[tus]) yolla(tus, true);
    }
  }

  function durdur() {
    if (sonrakiTur) { clearTimeout(sonrakiTur); sonrakiTur = null; }
  }

  function sonGoster(kazanan, ozet) { // her istemcide
    O.evre = 'son';
    U.sonPerde(kazanan, ozet);
    U.ustBarYenile();
  }

  function bitir(son) { // sadece oda sahibi
    if (son.kazanan != null) {
      O.skorlar[son.kazanan] = (O.skorlar[son.kazanan] || 0) + 1;
    }
    var ozet = O.oyun.ozet ? O.oyun.ozet(O.oyunDurum) : null;
    MG.net.yayinla({ t: 'son', kazanan: son.kazanan, skorlar: O.skorlar, ozet: ozet });
    sonGoster(son.kazanan, ozet);
    sonrakiTur = setTimeout(function () {
      if (O.evre !== 'son') return;
      if (O.oturanSayisi() < 2) return lobiyeDon();
      baslat();
    }, A.tur.sonPerdeSn * 1000);
  }

  function lobiyeDon() { // sadece oda sahibi
    if (!MG.net.hostMu()) return;
    MG.net.yayinla({ t: 'lobiyeDon', koltuklar: O.koltukOzet(), oyun: O.secilenOyun });
    MG.lobi.goster();
  }
  U.$('btnLobiyeDon').onclick = lobiyeDon;

  // --- ağ olayları ---------------------------------------------------------

  MG.net.olay.girisIstegi = function (conn, ad) {
    if (O.evre !== 'lobi') return reddet(conn, 'Oyun sürüyor — birazdan tekrar dene.');
    var bos = -1;
    for (var i = 1; i < A.oyuncuMax; i++) {
      if (!O.koltuklar[i]) { bos = i; break; }
    }
    if (bos === -1) return reddet(conn, 'Oda dolu (5/5).');
    O.koltuklar[bos] = { ad: ad, bot: false };
    MG.net.koltukBagla(conn, bos);
    conn.send({
      t: 'hosgeldin', koltuk: bos, koltuklar: O.koltukOzet(),
      skorlar: O.skorlar, oyun: O.secilenOyun
    });
    MG.lobi.degisti();
  };

  function reddet(conn, sebep) {
    conn.send({ t: 'dolu', sebep: sebep });
    setTimeout(function () { try { conn.close(); } catch (e) {} }, 500);
  }

  MG.net.olay.koptu = function (koltuk) { // oda sahibi: misafir düştü
    O.koltuklar[koltuk] = null;
    delete O.skorlar[koltuk];
    if (O.oyun && O.oyun.oyuncuDustu && O.oyunDurum) {
      O.oyun.oyuncuDustu(O.oyunDurum, koltuk);
    }
    if (O.evre === 'lobi') MG.lobi.degisti();
    else MG.net.yayinla({ t: 'lobiDurum', koltuklar: O.koltukOzet(), oyun: O.secilenOyun });
    U.ustBarYenile();
  };

  MG.net.olay.hostKoptu = function () { // misafir: oda sahibi düştü
    MG.lobi.ayril();
    U.girisHata('Oda sahibiyle bağlantı koptu.');
  };

  MG.net.olay.mesaj = function (koltuk, d) {
    if (MG.net.hostMu()) {
      // misafirden gelen tek oyun mesajı: girdi
      if (d.t === 'girdi' && O.oyunDurum) O.oyun.girdi(O.oyunDurum, koltuk, d.k, d.b);
      return;
    }
    // misafir tarafı — her şey oda sahibinden gelir
    if (d.t === 'lobiDurum') {
      O.koltuklar = d.koltuklar;
      if (d.oyun) O.secilenOyun = d.oyun;
      if (O.evre === 'lobi') MG.lobi.ciz(); else U.ustBarYenile();
    } else if (d.t === 'basla') {
      O.koltuklar = d.koltuklar;
      O.skorlar = d.skorlar || {};
      yerelBasla(d.tohum, d.oyun);
    } else if (d.t === 'durum') {
      if (O.oyunDurum) O.oyun.uygula(O.oyunDurum, d.s);
    } else if (d.t === 'son') {
      O.skorlar = d.skorlar || {};
      sonGoster(d.kazanan, d.ozet);
    } else if (d.t === 'lobiyeDon') {
      O.koltuklar = d.koltuklar;
      if (d.oyun) O.secilenOyun = d.oyun;
      MG.lobi.goster();
    }
  };

  // --- girdi ---------------------------------------------------------------

  var tusMap = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space' };

  function yolla(tus, basili) {
    if (!O.oyunDurum || (O.evre !== 'oyun' && O.evre !== 'sayim')) return;
    if (MG.net.hostMu()) O.oyun.girdi(O.oyunDurum, O.benKoltuk, tus, basili);
    else MG.net.gonder({ t: 'girdi', k: tus, b: basili });
  }

  addEventListener('keydown', function (e) {
    var tus = tusMap[e.code];
    if (!tus) return;
    if (O.evre === 'oyun' || O.evre === 'sayim') e.preventDefault();
    if (basiliTuslar[tus]) return; // otomatik tekrarı ele
    basiliTuslar[tus] = true;
    yolla(tus, true);
  });

  addEventListener('keyup', function (e) {
    var tus = tusMap[e.code];
    if (!tus) return;
    basiliTuslar[tus] = false;
    yolla(tus, false);
  });

  addEventListener('blur', function () { // sekme değişince tuş takılı kalmasın
    for (var tus in basiliTuslar) {
      if (basiliTuslar[tus]) { basiliTuslar[tus] = false; yolla(tus, false); }
    }
  });

  // --- ana döngü -----------------------------------------------------------
  // Simülasyon setInterval'de, çizim requestAnimationFrame'de.
  // rAF arka plan sekmesinde durur; simülasyon ona bağlanırsa oda sahibi
  // sekme değiştirdiğinde HERKESİN oyunu donar. setInterval yavaşlar ama durmaz.

  var sonZaman = 0;

  function simAdim() {
    var ts = performance.now();
    var dt = Math.min(0.1, (ts - sonZaman) / 1000 || 0);
    sonZaman = ts;
    if (!O.oyunDurum) return;

    if (O.evre === 'sayim') sayimAdim(dt);

    if (O.evre === 'oyun' && MG.net.hostMu()) {
      O.oyun.guncelle(O.oyunDurum, dt);
      yayinBirikim += dt * 1000;
      if (yayinBirikim >= A.yayin.durumMs) {
        yayinBirikim = 0;
        MG.net.yayinla({ t: 'durum', s: O.oyun.anlik(O.oyunDurum) });
      }
      var son = O.oyun.bitti(O.oyunDurum);
      if (son) bitir(son);
    }

    O.oyun.efekt(O.oyunDurum, dt);
    if (++ustBarSayac >= 15) { ustBarSayac = 0; U.ustBarYenile(); }
  }

  function sayimAdim(dt) {
    sayimKalan -= dt;
    var tik = Math.ceil(sayimKalan);
    if (tik !== sonSayimTik && tik > 0) {
      sonSayimTik = tik;
      MG.ses.sayim();
      U.sayimPerde(O.oyun, tik);
    }
    if (sayimKalan <= 0) {
      O.evre = 'oyun';
      U.perdeGizle();
      MG.ses.baslat();
    }
  }
  setInterval(simAdim, 1000 / 60);

  function cizKare() {
    requestAnimationFrame(cizKare);
    if (O.oyunDurum && O.evre !== 'giris' && O.evre !== 'lobi') {
      O.oyun.ciz(O.oyunDurum, U.cv, U.c2d, O.koltuklar, O.benKoltuk);
    }
  }
  requestAnimationFrame(cizKare);

  // Geliştirme kancası — konsoldan MG.ayikla() ile durum incelenir.
  MG.ayikla = function () { return O; };

  return { baslat: baslat, durdur: durdur, lobiyeDon: lobiyeDon };
})();
