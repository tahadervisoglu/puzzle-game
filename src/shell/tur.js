// Tur akışı, girdi yönlendirme, ana döngü ve ağ olaylarının bağlanması.
MG.tur = (function () {
  var A = MG.ayar;
  var O = MG.oturum;
  var U = MG.ui;

  var sayimKalan = 0, sonSayimTik = -1;
  var yayinBirikim = 0, ustBarSayac = 0;
  var zamanlayici = null;   // tur/final perdesi sonrası devam eden sayaç
  var basiliTuslar = {};

  // --- tur akışı -----------------------------------------------------------

  // Seri: kaç tur seçildiyse o kadar tur, her turda başka bir oyun.
  function seriBaslat() { // sadece oda sahibi
    O.turNo = 0;
    O.skorlar = {};
    O.oyunHavuzu = karistir(Object.keys(MG.oyunlar));
    O.sonOyun = null;
    sonrakiTur();
  }

  function karistir(dizi) { // Fisher-Yates
    var a = dizi.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Her tur farklı oyun: karışık bir havuzdan çekiyoruz. Doğrudan rastgele
  // seçmek aynı oyunu üst üste getirebiliyordu.
  function sonrakiOyunId() {
    if (!O.oyunHavuzu || !O.oyunHavuzu.length) {
      O.oyunHavuzu = karistir(Object.keys(MG.oyunlar));
      // Havuz yenilenirken başa son oynanan denk gelirse takas et, yoksa
      // tur sayısı oyun sayısını aşınca yine art arda tekrar olurdu.
      if (O.oyunHavuzu.length > 1 && O.oyunHavuzu[0] === O.sonOyun) {
        var t = O.oyunHavuzu[0];
        O.oyunHavuzu[0] = O.oyunHavuzu[1];
        O.oyunHavuzu[1] = t;
      }
    }
    O.sonOyun = O.oyunHavuzu.shift();
    return O.sonOyun;
  }

  function sonrakiTur() { // sadece oda sahibi
    O.turNo++;
    var oyunId = sonrakiOyunId();
    var tohum = (Math.random() * 0xFFFFFFFF) >>> 0;
    MG.net.yayinla({
      t: 'basla', tohum: tohum, oyun: oyunId,
      turNo: O.turNo, turSayisi: O.turSayisi,
      koltuklar: O.koltukOzet(), skorlar: O.skorlar
    });
    yerelBasla(tohum, oyunId);
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
    if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
  }

  function sonGoster(kazanan, ozet, sonTur) { // her istemcide
    O.evre = 'son';
    U.sonPerde(kazanan, ozet, sonTur);
    U.ustBarYenile();
  }

  // Sıralamaya göre puan: 1. 3, 2. 2, 3. 1. Oyun sıralama vermiyorsa
  // yalnızca kazanan puan alır.
  function puanDagit(son) {
    var sira = O.oyun.siralama
      ? O.oyun.siralama(O.oyunDurum)
      : (son.kazanan != null ? [son.kazanan] : []);
    var tablo = A.tur.siraPuanlari;
    for (var i = 0; i < sira.length; i++) {
      var puan = tablo[i] || 0;
      if (puan) O.skorlar[sira[i]] = (O.skorlar[sira[i]] || 0) + puan;
    }
  }

  function bitir(son) { // sadece oda sahibi
    puanDagit(son);
    var ozet = O.oyun.ozet ? O.oyun.ozet(O.oyunDurum) : null;
    var sonTur = O.turNo >= O.turSayisi;
    MG.net.yayinla({
      t: 'son', kazanan: son.kazanan, skorlar: O.skorlar,
      ozet: ozet, sonTur: sonTur
    });
    sonGoster(son.kazanan, ozet, sonTur);

    zamanlayici = setTimeout(function () {
      if (O.evre !== 'son') return;
      if (O.oturanSayisi() < 2) return lobiyeDon();
      if (sonTur) return finalBitir();
      sonrakiTur();
    }, A.tur.sonPerdeSn * 1000);
  }

  // Seri bitti: şampiyon ekranı, sonra herkes lobiye döner.
  function finalBitir() {
    MG.net.yayinla({ t: 'final', skorlar: O.skorlar });
    finalGoster();
    zamanlayici = setTimeout(function () {
      if (O.evre === 'final') lobiyeDon();
    }, A.tur.finalPerdeSn * 1000);
  }

  function finalGoster() { // her istemcide
    O.evre = 'final';
    U.finalPerde();
  }

  function lobiyeDon() { // sadece oda sahibi
    if (!MG.net.hostMu()) return;
    MG.net.yayinla({ t: 'lobiyeDon', koltuklar: O.koltukOzet(), turSayisi: O.turSayisi });
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
      skorlar: O.skorlar, turSayisi: O.turSayisi
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
    else MG.net.yayinla({ t: 'lobiDurum', koltuklar: O.koltukOzet(), turSayisi: O.turSayisi });
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
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      if (O.evre === 'lobi') MG.lobi.ciz(); else U.ustBarYenile();
    } else if (d.t === 'basla') {
      O.koltuklar = d.koltuklar;
      O.skorlar = d.skorlar || {};
      if (d.turNo) O.turNo = d.turNo;
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      yerelBasla(d.tohum, d.oyun);
    } else if (d.t === 'durum') {
      if (O.oyunDurum) O.oyun.uygula(O.oyunDurum, d.s);
    } else if (d.t === 'son') {
      O.skorlar = d.skorlar || {};
      sonGoster(d.kazanan, d.ozet, d.sonTur);
    } else if (d.t === 'final') {
      O.skorlar = d.skorlar || {};
      finalGoster();
    } else if (d.t === 'lobiyeDon') {
      O.koltuklar = d.koltuklar;
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      MG.lobi.goster();
    }
  };

  // --- girdi ---------------------------------------------------------------

  // Aynı yöne birden çok fiziksel tuş bakar (WASD ve ok tuşları).
  var tusMap = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space',
    ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd'
  };
  var fizikselBasili = {};   // e.code -> basılı mı

  function yolla(tus, basili) {
    if (!O.oyunDurum || (O.evre !== 'oyun' && O.evre !== 'sayim')) return;
    if (MG.net.hostMu()) O.oyun.girdi(O.oyunDurum, O.benKoltuk, tus, basili);
    else MG.net.gonder({ t: 'girdi', k: tus, b: basili });
  }

  // Bir yön, ona bakan fiziksel tuşlardan HERHANGİ biri basılıyken açıktır.
  // Yoksa W ve yukarı ok birlikte tutulup biri bırakılınca hareket kesilirdi.
  function tusuTazele(tus) {
    var yeni = false;
    for (var code in tusMap) {
      if (tusMap[code] === tus && fizikselBasili[code]) { yeni = true; break; }
    }
    if (basiliTuslar[tus] === yeni) return;
    basiliTuslar[tus] = yeni;
    yolla(tus, yeni);
  }

  addEventListener('keydown', function (e) {
    var tus = tusMap[e.code];
    if (!tus) return;
    if (O.evre === 'oyun' || O.evre === 'sayim') e.preventDefault();
    if (fizikselBasili[e.code]) return; // otomatik tekrarı ele
    fizikselBasili[e.code] = true;
    tusuTazele(tus);
  });

  addEventListener('keyup', function (e) {
    var tus = tusMap[e.code];
    if (!tus) return;
    fizikselBasili[e.code] = false;
    tusuTazele(tus);
  });

  addEventListener('blur', function () { // sekme değişince tuş takılı kalmasın
    fizikselBasili = {};
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

  return { seriBaslat: seriBaslat, durdur: durdur, lobiyeDon: lobiyeDon };
})();
