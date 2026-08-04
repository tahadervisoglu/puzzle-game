// Yokuş Aşağı — herkes buz kalıbının içinde dik bir yamaçtan kayıyor.
//
// Fizik yamaç boyunca ölçülen (s, h) koordinatında çalışır: s yamaç boyunca
// kat edilen yol, h yüzeyden dik yükseklik. Dünya koordinatına çevirmeyi
// yokus.yamac üstlenir. Bunun sebebi çarpışma: eğimli bir yüzeyde kutuları
// dünya x/y'sinde çözmek karmaşıkken, (s, h) uzayında düz bir platform
// oyunu gibi çözülüyor — üst üste binme de buradan geliyor.
//
// Yatay kontrol YOKTUR. Yerçekiminin yamaca teğet bileşeni hızlandırır,
// sürtünme terminal hızda dengeler. Tek eylem: ZIPLAMAK.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.yokus = (function () {
  var A = MG.ayar;
  var K = A.yokus;
  var Y = MG.yokusYamac;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var ofset = rng() * 3000;
    var d = {
      rng: rng,
      ofset: ofset,
      noktalar: Y.uret(ofset),
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      tozlar: [],
      kalan: K.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      d.oyuncular[s] = {
        s: -i * (K.boy + 8),  // ızgara: sırayla dizil
        h: 0,
        vs: 50, vh: 0,
        yerde: true, ustumde: false,
        carpma: 0, oncekiSpace: false
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { tepki: 0.02 + rng() * 0.12 };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function egimAci(d, s) { return Math.atan(Y.egim(d.ofset, s)); }

  function lider(d) {
    var en = -Infinity;
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].s > en) en = d.oyuncular[k].s;
    }
    return en === -Infinity ? 0 : en;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    var on = lider(d);
    for (var k in d.oyuncular) {
      if (d.botDurum[k]) MG.yokusBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, dt, on);
    }
    carpismalar(d, dt);
  }

  function oyuncuGuncelle(d, koltuk, dt, on) {
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    var aci = egimAci(d, o.s);

    // 1) Tek kontrol: zıplama. Yerdeyken ya da birinin üstündeyken geçerli.
    if (g.space && !o.oncekiSpace && o.yerde) {
      o.vh = K.zipKuvvet;
      o.yerde = false;
      MG.ses.zipla();
    }
    o.oncekiSpace = g.space;

    // 2) Yerçekiminin yamaca dik bileşeni yükseklikten düşürür
    o.vh -= K.yercekimi * Math.cos(aci) * dt;
    o.h += o.vh * dt;

    // 3) Teğet bileşen hızlandırır; sürtünme terminal hızda dengeler.
    //    Havadayken ivme yok — yalnızca yerdeyken sürüklenirsin.
    if (o.yerde) {
      var ivme = K.yercekimi * Math.sin(aci);
      var geri = Math.min(K.enFazlaGeri, on - o.s);
      ivme *= 1 + (geri / K.enFazlaGeri) * K.slipstream;
      o.vs += ivme * dt;
      o.vs -= o.vs * K.surtunme * dt;
      if (o.ustumde) o.vs -= o.vs * K.ezilmeYavaslatma * dt; // sırtındaki yük
    }
    if (o.vs > K.maxHiz) o.vs = K.maxHiz;
    if (o.vs < K.enAzHiz) o.vs = K.enAzHiz;
    o.s += o.vs * dt;

    // 4) Zemin: h sıfırın altına inemez
    if (o.h <= 0) {
      if (!o.yerde && o.vh < -60) toz(d, o);
      o.h = 0;
      o.vh = 0;
      o.yerde = true;
    }
    // yerde bayrağı çarpışma çözümünde yeniden hesaplanır
    else if (o.vh > 0) o.yerde = false;

    o.carpma = Math.max(0, o.carpma - dt);
    o.ustumde = false;

    if (on - o.s > K.enFazlaGeri) {
      o.s += (on - K.enFazlaGeri - o.s) * Math.min(1, dt * 3);
    }
  }

  // --- çarpışma ------------------------------------------------------------
  // (s, h) uzayında kutular. Hangi eksende daha az girmişlerse oradan
  // ayrılırlar: yandan çarpma iter ve hızları ortaklaştırır, üstten çarpma
  // ise binme olur — üstteki alttakinin sırtında taşınır.

  function carpismalar(d, dt) {
    // Alttakiler önce çözülsün ki üstündekiler doğru yere otursun
    var ks = Object.keys(d.oyuncular).sort(function (p, q) {
      return d.oyuncular[p].h - d.oyuncular[q].h;
    });

    for (var tur = 0; tur < 3; tur++) { // birkaç geçiş: yığınlar oturur
      for (var i = 0; i < ks.length; i++) {
        for (var j = i + 1; j < ks.length; j++) {
          cift(d.oyuncular[ks[i]], d.oyuncular[ks[j]], dt);
        }
      }
    }
    for (i = 0; i < ks.length; i++) {
      var o = d.oyuncular[ks[i]];
      if (o.h <= 0.01) { o.h = 0; o.yerde = true; }
    }
  }

  function cift(a, b, dt) {
    var ds = a.s - b.s;
    var dh = a.h - b.h;
    var sGirme = K.boy - Math.abs(ds);
    var hGirme = K.boy - Math.abs(dh);
    if (sGirme <= 0 || hGirme <= 0) return;

    if (hGirme < sGirme) {
      // Üstten binme
      var ust = dh >= 0 ? a : b;
      var alt = dh >= 0 ? b : a;
      ust.h = alt.h + K.boy;
      if (ust.vh < 0) ust.vh = 0;      // sırtına oturdu, düşüşü durdu
      ust.yerde = true;
      alt.ustumde = true;
      // Taşınan, taşıyanın hızını kapar — üstüne binmek onu geçmenin yolu
      ust.vs += (alt.vs - ust.vs) * Math.min(1, dt * 8);
      MG.ses.zipla();
    } else {
      // Yandan çarpma: ayır ve hızları ortaklaştır, birlikte gitsinler
      var it = sGirme / 2 + 0.2;
      if (ds > 0) { a.s += it; b.s -= it; }
      else { a.s -= it; b.s += it; }
      var ort = (a.vs + b.vs) / 2;
      a.vs += (ort - a.vs) * K.hizPaylasim;
      b.vs += (ort - b.vs) * K.hizPaylasim;
      a.carpma = b.carpma = 0.25;
    }
  }

  function toz(d, o) {
    for (var i = 0; i < 6; i++) {
      d.tozlar.push({
        s: o.s - 4 + (Math.random() - 0.5) * K.boy,
        h: o.h + 2,
        vs: -70 - Math.random() * 90,
        vh: 40 + Math.random() * 90,
        omur: 0.3 + Math.random() * 0.35
      });
    }
  }

  // --- sonuç ---------------------------------------------------------------

  function siralama(d) {
    var ks = Object.keys(d.oyuncular).map(Number);
    ks.sort(function (p, q) { return d.oyuncular[q].s - d.oyuncular[p].s; });
    return ks;
  }

  function bitti(d) {
    if (d.kalan > 0) return null;
    var s = siralama(d);
    return { kazanan: s.length ? s[0] : null };
  }

  function ozet(d) {
    var o = {};
    var s = siralama(d);
    for (var i = 0; i < s.length; i++) {
      o[s[i]] = (i + 1) + '. · ' + Math.max(0, Math.round(d.oyuncular[s[i]].s / 10)) + ' m';
    }
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.s), Math.round(o.h),
               Math.round(o.vs), o.yerde ? 1 : 0]);
    }
    return { oy: oy, ka: Math.round(d.kalan * 10) / 10 };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncekiYerde = o.yerde;
      o.s = v[1]; o.h = v[2]; o.vs = v[3]; o.yerde = v[4] === 1;
      if (oncekiYerde && !o.yerde) MG.ses.zipla();
      if (!oncekiYerde && o.yerde) toz(d, o);
    }
  }

  function efekt(d, dt) {
    for (var i = d.tozlar.length - 1; i >= 0; i--) {
      var t = d.tozlar[i];
      t.omur -= dt;
      if (t.omur <= 0) { d.tozlar.splice(i, 1); continue; }
      t.s += t.vs * dt;
      t.h += t.vh * dt;
      t.vh -= 260 * dt;
    }
  }

  return {
    id: 'yokus',
    ad: 'Yokuş Aşağı',
    kurallar: 'Boşluk: zıpla · Rakibin üstüne bin, önünü kes · 30 sn sonunda en öndeki kazanır',
    egimAci: egimAci,
    lider: lider,
    siralama: siralama,
    kur: kur,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.yokusCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
