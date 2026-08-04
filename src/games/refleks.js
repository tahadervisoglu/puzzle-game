// Şimşek Refleks — ortaya çıkan şeyi ilk kapan alır.
// Hareket yok, tek tuş: Boşluk. Ortada bir şey yokken basmak ceza getirir,
// yoksa sürekli basan herkesi yener.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.refleks = (function () {
  var A = MG.ayar;
  var R = A.refleks;

  // Ağda tip yerine dizin taşınır; sıra değişirse ağ paketi de değişir.
  var TIPLER = [
    { id: 'a1', metin: '+1', puan: 1, agirlik: 30, renk: '#2ecc40' },
    { id: 'a2', metin: '+2', puan: 2, agirlik: 15, renk: '#149c2b' },
    { id: 'e1', metin: '−1', puan: -1, agirlik: 20, renk: '#e63946' },
    { id: 'e2', metin: '−2', puan: -2, agirlik: 10, renk: '#a4161a' },
    { id: 'bomba', metin: '', puan: 0, agirlik: 14, renk: '#2b2b2b', donma: true },
    { id: 'buz', metin: '', puan: 0, agirlik: 11, renk: '#3aa6d8', buz: true }
  ];
  var AGIRLIK_TOPLAM = TIPLER.reduce(function (t, x) { return t + x.agirlik; }, 0);

  function tipSec(rng) {
    var n = rng() * AGIRLIK_TOPLAM;
    for (var i = 0; i < TIPLER.length; i++) {
      n -= TIPLER[i].agirlik;
      if (n <= 0) return i;
    }
    return 0;
  }

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      nesne: null,
      bekleme: 1.0,
      balonlar: [],       // ekranda uçan "+1" yazıları
      kalan: R.turSureSn
    };
    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      d.oyuncular[k] = { puan: 0, donma: 0, oncekiSpace: false, parlama: 0 };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) d.botDurum[k] = { tepki: 0, basacak: false };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    nesneAkisi(d, dt);

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      o.donma = Math.max(0, o.donma - dt);
      o.parlama = Math.max(0, o.parlama - dt);
      if (d.botDurum[k]) botGuncelle(d, +k, dt);

      var g = d.girdiler[k];
      if (g.space && !o.oncekiSpace) basildi(d, +k, o);
      o.oncekiSpace = g.space;
    }
  }

  function nesneAkisi(d, dt) {
    if (d.nesne) {
      d.nesne.kalan -= dt;
      if (d.nesne.kalan <= 0) {
        d.nesne = null;
        d.bekleme = R.beklemeMin + d.rng() * (R.beklemeMax - R.beklemeMin);
      }
      return;
    }
    d.bekleme -= dt;
    if (d.bekleme <= 0) {
      d.nesne = { tip: tipSec(d.rng), kalan: R.gorunmeSn, kapan: -1 };
      for (var k in d.botDurum) botHazirla(d, +k);
    }
  }

  function basildi(d, koltuk, o) {
    if (o.donma > 0) return; // eli donmuş, basamaz

    if (!d.nesne || d.nesne.kapan >= 0) {
      // Ortada kapılacak bir şey yok. Geç kalmak ceza değil ama boşluğa
      // basmak — yani spam — eli dondurur.
      if (!d.nesne) {
        o.donma = R.spamDonmaSn;
        balon(d, koltuk, 'Buz!', '#3aa6d8');
        MG.ses.donma();
      }
      return;
    }
    kap(d, koltuk, o);
  }

  function kap(d, koltuk, o) {
    var t = TIPLER[d.nesne.tip];
    d.nesne.kapan = koltuk;
    d.nesne.kalan = R.kapmaGosterimSn;
    o.parlama = 0.5;

    if (t.puan) {
      o.puan += t.puan;
      balon(d, koltuk, (t.puan > 0 ? '+' : '') + t.puan, t.renk);
    }
    if (t.donma) {
      o.donma = R.bombaDonmaSn;
      balon(d, koltuk, 'Bomba!', '#2b2b2b');
      MG.ses.patlama();
      return;
    }
    if (t.buz) { // kapan hariç herkes donar
      for (var k in d.oyuncular) {
        if (+k === koltuk) continue;
        d.oyuncular[k].donma = R.buzDonmaSn;
      }
      balon(d, koltuk, 'Herkesi dondurdu!', '#3aa6d8');
      MG.ses.donma();
      return;
    }
    MG.ses.kap();
  }

  function balon(d, koltuk, metin, renk) {
    d.balonlar.push({ koltuk: koltuk, metin: metin, renk: renk, omur: 1.1 });
  }

  // --- bot -----------------------------------------------------------------

  function botHazirla(d, koltuk) {
    var b = d.botDurum[koltuk];
    var t = TIPLER[d.nesne.tip];
    var kotu = t.puan < 0 || t.donma;
    b.tepki = R.botTepkiMin + d.rng() * (R.botTepkiMax - R.botTepkiMin);
    b.basacak = kotu ? d.rng() < R.botYanilma : true;
  }

  function botGuncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var g = d.girdiler[koltuk];
    g.space = false;
    if (!d.nesne || d.nesne.kapan >= 0 || !b.basacak) return;
    b.tepki -= dt;
    if (b.tepki <= 0) g.space = true;
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, o.puan, Math.round(o.donma * 10) / 10]);
    }
    return {
      oy: oy,
      ne: d.nesne ? [d.nesne.tip, Math.round(d.nesne.kalan * 100) / 100, d.nesne.kapan] : null,
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      // Puan farkından balon üret — olayları ayrıca yayınlamaya gerek yok.
      if (v[1] !== o.puan) {
        var f = v[1] - o.puan;
        balon(d, v[0], (f > 0 ? '+' : '') + f, f > 0 ? '#2ecc40' : '#e63946');
        o.parlama = 0.5;
        MG.ses.kap();
      }
      if (v[2] > 0 && o.donma <= 0) MG.ses.donma();
      o.puan = v[1];
      o.donma = v[2];
    }
    var oncekiKapan = d.nesne ? d.nesne.kapan : -1;
    d.nesne = s.ne ? { tip: s.ne[0], kalan: s.ne[1], kapan: s.ne[2] } : null;
    if (d.nesne && d.nesne.kapan >= 0 && oncekiKapan < 0) {
      var t = TIPLER[d.nesne.tip];
      if (t.donma) MG.ses.patlama();
    }
  }

  function efekt(d, dt) {
    for (var i = d.balonlar.length - 1; i >= 0; i--) {
      d.balonlar[i].omur -= dt;
      if (d.balonlar[i].omur <= 0) d.balonlar.splice(i, 1);
    }
  }

  // --- sonuç ---------------------------------------------------------------

  function bitti(d) {
    if (d.kalan > 0) return null;
    var enCok = -Infinity, kazanan = null, berabere = false;
    for (var k in d.oyuncular) {
      var p = d.oyuncular[k].puan;
      if (p > enCok) { enCok = p; kazanan = +k; berabere = false; }
      else if (p === enCok) berabere = true;
    }
    return { kazanan: berabere ? null : kazanan };
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = d.oyuncular[k].puan + ' puan';
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  return {
    id: 'refleks',
    ad: 'Şimşek Refleks',
    kurallar: 'Boşluk: kap · Eksiye ve bombaya dokunma · Boşa basarsan elin donar',
    tipler: TIPLER,
    kur: kur,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar) { MG.refleksCizim.ciz(d, cv, c, koltuklar); },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
