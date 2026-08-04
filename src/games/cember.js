// Çember Kaçış — herkes bir çemberin üzerinde, ortadaki canavar saldırıyor.
// A/D ile sağa sola kaç. Zorluk zamanla artar, son kalan kazanır.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.cember = (function () {
  var A = MG.ayar;
  var C = A.cember;
  var G = MG.geo;
  var TAU = Math.PI * 2;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      saldirilar: [],     // isin | bosluk
      mermiler: [],
      parcalar: [],
      sonraki: C.ilkBekleme,
      gecen: 0,
      kalan: C.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    // Çembere eşit aralıklarla dizil
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      d.oyuncular[s] = {
        aci: (i / oturanlar.length) * TAU,
        canli: true, dusme: 0
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) {
        d.botDurum[s] = {
          yon: 1, karar: 0,
          tepki: C.botTepkiMin + rng() * (C.botTepkiMax - C.botTepkiMin)
        };
      }
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // Zorluk her basamakta bir artar; saldırı aralığı ve uyarı süresi buna göre
  // kısalır. Oyun baslangicZorluk kademesinden açılır — daha aşağısı boş geçiyordu.
  function zorluk(d) { return C.baslangicZorluk + d.gecen / C.zorlukBasamakSn; }

  function aciFarki(a, b) { return Math.abs(G.aciNormalle(a - b)); }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    d.gecen += dt;

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) { o.dusme = Math.min(1, o.dusme + dt * 1.5); continue; }
      if (d.botDurum[k]) MG.cemberBot.guncelle(d, +k, dt);
      var g = d.girdiler[k];
      var yon = (g.d ? 1 : 0) - (g.a ? 1 : 0);
      if (yon) o.aci = (o.aci + yon * C.oyuncuHiz * dt + TAU) % TAU;
    }

    saldiriAkisi(d, dt);
    saldirilariGuncelle(d, dt);
    mermileriGuncelle(d, dt);
  }

  function saldiriAkisi(d, dt) {
    d.sonraki -= dt;
    if (d.sonraki > 0) return;
    var z = zorluk(d);
    saldiriUret(d, z);
    d.sonraki = Math.max(C.araEnAz, C.araBaslangic - (z - 1) * 0.2);
  }

  function saldiriUret(d, z) {
    var uyari = Math.max(C.uyariEnAz, C.uyariBaslangic - (z - 1) * 0.09);
    var n = d.rng();

    if (n < 0.42) {
      isinEkle(d, d.rng() * TAU, uyari);
      // Zorluk yükseldikçe ışınlar çifter gelmeye başlar
      if (z > 2.2 && d.rng() < 0.45) {
        isinEkle(d, d.rng() * TAU, uyari);
      }
    } else if (n < 0.72) {
      var adet = 1 + Math.floor(Math.min(3, (z - 1) * 0.9) * d.rng() + 0.5);
      for (var i = 0; i < adet; i++) {
        d.mermiler.push({ aci: d.rng() * TAU, r: 40 });
      }
    } else {
      d.saldirilar.push({
        tip: 'bosluk', aci: d.rng() * TAU,
        genislik: C.boslukGenislik, evre: 'uyari', kalan: uyari * 1.25
      });
    }
  }

  function isinEkle(d, aci, uyari) {
    d.saldirilar.push({
      tip: 'isin', aci: aci, genislik: C.isinGenislik,
      evre: 'uyari', kalan: uyari
    });
  }

  function saldirilariGuncelle(d, dt) {
    for (var i = d.saldirilar.length - 1; i >= 0; i--) {
      var s = d.saldirilar[i];
      s.kalan -= dt;

      if (s.evre === 'uyari') {
        if (s.kalan > 0) continue;
        s.evre = 'aktif';
        s.kalan = s.tip === 'isin' ? C.isinSuresi : C.boslukSuresi;
        if (s.tip === 'isin') MG.ses.lazer();
        continue;
      }

      // Aktif evre: her karede kontrol et — kaçarken içine giren de yansın
      for (var k in d.oyuncular) {
        var o = d.oyuncular[k];
        if (o.canli && aciFarki(o.aci, s.aci) < s.genislik / 2) vuruldu(d, +k, o);
      }
      if (s.kalan <= 0) d.saldirilar.splice(i, 1);
    }
  }

  function mermileriGuncelle(d, dt) {
    for (var i = d.mermiler.length - 1; i >= 0; i--) {
      var m = d.mermiler[i];
      m.r += C.mermiHiz * dt;
      if (m.r < C.yaricap - 10) continue;
      for (var k in d.oyuncular) {
        var o = d.oyuncular[k];
        if (o.canli && aciFarki(o.aci, m.aci) < C.mermiVurmaAci) vuruldu(d, +k, o);
      }
      d.mermiler.splice(i, 1);
    }
  }

  function vuruldu(d, koltuk, o) {
    o.canli = false;
    o.dusme = 0;
    patlama(d, o.aci);
    MG.ses.patlama();
  }

  function patlama(d, aci) {
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * TAU;
      var h = 30 + Math.random() * 120;
      d.parcalar.push({
        x: Math.cos(aci) * C.yaricap, y: Math.sin(aci) * C.yaricap,
        vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.4
      });
    }
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.aci * 100) / 100, o.canli ? 1 : 0]);
    }
    return {
      oy: oy,
      sa: d.saldirilar.map(function (s) {
        return [s.tip === 'isin' ? 0 : 1, Math.round(s.aci * 100) / 100,
                Math.round(s.genislik * 100) / 100, s.evre === 'uyari' ? 0 : 1];
      }),
      me: d.mermiler.map(function (m) {
        return [Math.round(m.aci * 100) / 100, Math.round(m.r)];
      }),
      ge: Math.round(d.gecen),
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    if (s.ge != null) d.gecen = s.ge;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncedenCanli = o.canli;
      o.aci = v[1];
      o.canli = v[2] === 1;
      if (oncedenCanli && !o.canli) { o.dusme = 0; patlama(d, o.aci); MG.ses.patlama(); }
    }
    var oncekiAktif = d.saldirilar.filter(function (x) { return x.evre === 'aktif'; }).length;
    d.saldirilar = s.sa.map(function (v) {
      return { tip: v[0] === 0 ? 'isin' : 'bosluk', aci: v[1], genislik: v[2],
               evre: v[3] === 0 ? 'uyari' : 'aktif', kalan: 1 };
    });
    var yeniAktif = d.saldirilar.filter(function (x) { return x.evre === 'aktif'; }).length;
    if (yeniAktif > oncekiAktif) MG.ses.lazer();
    d.mermiler = s.me.map(function (v) { return { aci: v[0], r: v[1] }; });
  }

  function efekt(d, dt) {
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.93; p.vy *= 0.93;
    }
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) o.dusme = Math.min(1, o.dusme + dt * 1.5);
    }
  }

  // --- sonuç ---------------------------------------------------------------

  function bitti(d) {
    var canlilar = [];
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].canli) canlilar.push(+k);
    }
    if (canlilar.length === 1) return { kazanan: canlilar[0] };
    if (canlilar.length === 0) return { kazanan: null };
    if (d.kalan <= 0) return { kazanan: null };
    return null;
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) {
      o[k] = d.oyuncular[k].canli ? 'hayatta' : 'elendi';
    }
    return o;
  }

  function oyuncuOlu(d, koltuk) {
    return !!(d.oyuncular[koltuk] && !d.oyuncular[koltuk].canli);
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  return {
    id: 'cember',
    ad: 'Çember Kaçış',
    kurallar: 'A / D: çemberde kaç · Lazerlerden ve açılan boşluktan sakın · Son kalan kazanır',
    kur: kur,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar) {
      MG.cemberCizim.ciz(d, cv, c, koltuklar, zorluk(d));
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
