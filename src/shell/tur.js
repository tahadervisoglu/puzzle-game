// Tur akışı, girdi yönlendirme, ana döngü ve sunucu mesajlarının işlenmesi.
//
// Otorite sunucuda: burada hiçbir dünya simüle edilmiyor. İstemcinin işi
// tuşları yollamak, gelen durumu yumuşatarak çizmek ve perdeleri göstermek.
// Eskiden bu işi oyunculardan biri (oda sahibi) yapıyordu ve o kişinin
// girdisi gecikmesizdi; sunucu modeline geçmemizin sebebi tam olarak buydu.
MG.tur = (function () {
  var A = MG.ayar;
  var O = MG.oturum;
  var U = MG.ui;

  var sayimKalan = 0, sonSayimTik = -1;
  var ustBarSayac = 0;
  var basiliTuslar = {};
  var gecikmeMs = 0;   // ölçülen gidiş-dönüş; tahminin sapma hesabı buna dayanır

  // --- tur akışı -----------------------------------------------------------

  function yerelBasla(tohum, oyunId) {
    O.oyun = MG.oyunlar[oyunId] || MG.oyunlar.tank;
    O.oyunDurum = O.oyun.kur(tohum, O.koltuklar);
    // Tahmin yalnızca kendi oyuncun için çalışır. Oyunlar bu koltuğu görünce
    // sunucudan gelen konumu doğrudan yazmaz, düzeltme olarak işler.
    // Oyun tahmini desteklemiyorsa -1 kalır ve her şey eskisi gibi çalışır.
    O.oyunDurum.tahminKoltuk = O.oyun.tahmin ? O.benKoltuk : -1;
    O.evre = 'sayim';
    sayimKalan = A.tur.geriSayimSn;
    sonSayimTik = -1;
    U.ekranGoster('ekranOyun');
    U.boyutlandir();
    U.$('btnLobiyeDon').classList.add('gizli');   // tur akışını sunucu yönetiyor
    U.ustBarYenile();
    tuslariTazele();
  }

  // Tur başında basılı tutulan tuşları yeniden bildir — sunucu yeni turda
  // girdileri sıfırdan kuruyor, "değişince gönder" mantığı bunları kaçırır.
  function tuslariTazele() {
    for (var tus in basiliTuslar) {
      if (basiliTuslar[tus]) yolla(tus, true);
    }
  }

  function durdur() { /* zamanlayıcı sunucuda; burada temizlenecek bir şey yok */ }

  function sonGoster(kazanan, ozet, sonTur) {
    O.evre = 'son';
    U.sonPerde(kazanan, ozet, sonTur);
    U.ustBarYenile();
  }

  function finalGoster() {
    O.evre = 'final';
    U.finalPerde();
  }

  // --- sunucu mesajları ----------------------------------------------------

  MG.net.olay.mesaj = function (d) {
    if (d.t === 'lobiDurum') {
      O.koltuklar = d.koltuklar;
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      if ('secilenOyun' in d) O.secilenOyun = d.secilenOyun;
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

    } else if (d.t === 'yanki') {
      // Tek ölçüm ağ dalgalanmasıyla zıplıyor; yumuşatılmış ortalama tutulur.
      var olcum = MG.simdi() - d.z;
      gecikmeMs = gecikmeMs ? gecikmeMs * 0.7 + olcum * 0.3 : olcum;

    } else if (d.t === 'lobiyeDon') {
      O.koltuklar = d.koltuklar;
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      if ('secilenOyun' in d) O.secilenOyun = d.secilenOyun;
      MG.lobi.goster();
    }
  };

  MG.net.olay.koptu = function () {
    MG.lobi.ayril();
    U.girisHata('Sunucu bağlantısı koptu.');
  };

  // --- girdi ---------------------------------------------------------------

  // Aynı yöne birden çok fiziksel tuş bakar (WASD ve ok tuşları).
  var tusMap = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space',
    ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd'
  };
  var fizikselBasili = {};

  function yolla(tus, basili) {
    if (!O.oyunDurum || (O.evre !== 'oyun' && O.evre !== 'sayim')) return;
    // Girdi önce yerelde işlenir: tahmin bu sayede tuşa anında tepki verir.
    // Sunucuya gitmesi ve dönmesi beklenirse zaten gizlemek istediğimiz
    // gecikme geri gelir.
    if (O.oyunDurum.tahminKoltuk >= 0) {
      O.oyun.girdi(O.oyunDurum, O.benKoltuk, tus, basili);
    }
    MG.net.gonder({ t: 'girdi', k: tus, b: basili });
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
    if (fizikselBasili[e.code]) return;   // otomatik tekrarı ele
    fizikselBasili[e.code] = true;
    tusuTazele(tus);
  });

  addEventListener('keyup', function (e) {
    var tus = tusMap[e.code];
    if (!tus) return;
    fizikselBasili[e.code] = false;
    tusuTazele(tus);
  });

  addEventListener('blur', function () {   // sekme değişince tuş takılı kalmasın
    fizikselBasili = {};
    for (var tus in basiliTuslar) {
      if (basiliTuslar[tus]) { basiliTuslar[tus] = false; yolla(tus, false); }
    }
  });

  // --- ana döngü -----------------------------------------------------------
  // Simülasyon yok; yalnızca geri sayım perdesi, görsel efektler ve çizim.
  // Efekt döngüsü setInterval'de duruyor çünkü rAF arka plan sekmesinde
  // durur ve geri gelindiğinde efektler birikmiş olarak patlar.

  var sonZaman = 0;

  function simAdim() {
    try {
      simAdimIc();
    } catch (e) {
      if (!simAdim.hataBildirildi) {
        simAdim.hataBildirildi = true;
        console.error('Görsel döngüde hata (' + (O.oyun && O.oyun.id) + '):', e);
      }
    }
  }

  function simAdimIc() {
    var ts = performance.now();
    var dt = Math.min(0.1, (ts - sonZaman) / 1000 || 0);
    sonZaman = ts;
    if (!O.oyunDurum) return;

    if (O.evre === 'sayim') sayimAdim(dt);
    // Oyunlar sapmayı hesaplarken gecikmeyi bilmeli: sunucudan gelen durum
    // bir gidiş-dönüşün yarısı kadar geçmişe ait.
    O.oyunDurum.gecikmeMs = gecikmeMs;
    if (O.evre === 'oyun' && O.oyunDurum.tahminKoltuk >= 0) {
      O.oyun.tahmin(O.oyunDurum, O.benKoltuk, dt);
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

  setInterval(function () {
    if (MG.net.bagliMi()) MG.net.gonder({ t: 'yanki', z: MG.simdi() });
  }, A.tahmin.olcumMs);

  function cizKare() {
    requestAnimationFrame(cizKare);
    if (O.oyunDurum && O.evre !== 'giris' && O.evre !== 'lobi') {
      O.oyun.ciz(O.oyunDurum, U.cv, U.c2d, O.koltuklar, O.benKoltuk);
    }
  }
  requestAnimationFrame(cizKare);

  // Geliştirme kancası — konsoldan MG.ayikla() ile durum incelenir.
  MG.ayikla = function () { return O; };

  return { durdur: durdur };
})();
