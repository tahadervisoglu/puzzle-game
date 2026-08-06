// Kral Tepesi — ortadaki dairede durduğun her saniye puan kazanırsın.
// Kimse elenmez, herkes sonuna kadar oyunda: tek yol rakipleri tepeden
// itip kendine yer açmak. Tepe belli aralıklarla yer değiştirir, yoksa
// bir köşeye kilitlenip beklemek yeterdi.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.kral = (function () {
  var A = MG.ayar;
  var K = A.kral;
  var G = MG.geo;
  var W = A.dunya.w, H = A.dunya.h;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      duvarlar: G.cerceve(),
      tepe: { x: W / 2, y: H / 2, hx: W / 2, hy: H / 2, kayma: 0 },
      sonrakiKayma: K.tepeKaymaSn,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      skor: {},
      dalgalar: [],
      kalan: K.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    var bas = rng() * Math.PI * 2;
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var a = bas + (i / oturanlar.length) * Math.PI * 2;
      d.oyuncular[s] = {
        x: W / 2 + Math.cos(a) * (W * 0.32),
        y: H / 2 + Math.sin(a) * (H * 0.32),
        vx: 0, vy: 0, aci: a + Math.PI,
        bekleme: 0, oncekiSpace: false, tepede: false
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      d.skor[s] = 0;
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0 };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function tepedeMi(d, o) {
    var dx = o.x - d.tepe.x, dy = o.y - d.tepe.y;
    return dx * dx + dy * dy <= K.tepeYaricap * K.tepeYaricap;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    tepeGuncelle(d, dt);

    for (var k in d.oyuncular) {
      if (d.botDurum[k]) MG.kralBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, dt);
    }
    carpismalar(d);
    puanVer(d, dt);
  }

  function tepeGuncelle(d, dt) {
    if (d.tepe.kayma > 0) {
      d.tepe.kayma -= dt;
      var t = 1 - Math.max(0, d.tepe.kayma / K.tepeKaymaSuresi);
      d.tepe.x += (d.tepe.hx - d.tepe.x) * Math.min(1, dt * 6);
      d.tepe.y += (d.tepe.hy - d.tepe.y) * Math.min(1, dt * 6);
      return;
    }
    d.sonrakiKayma -= dt;
    if (d.sonrakiKayma > 0) return;
    d.sonrakiKayma = K.tepeKaymaSn;
    d.tepe.kayma = K.tepeKaymaSuresi;
    // Yeni yer: kenarlardan uzak, mevcut yerden belirgin uzak olsun
    for (var i = 0; i < 20; i++) {
      var nx = 120 + d.rng() * (W - 240);
      var ny = 110 + d.rng() * (H - 220);
      if (Math.hypot(nx - d.tepe.x, ny - d.tepe.y) > 170) {
        d.tepe.hx = nx; d.tepe.hy = ny;
        return;
      }
    }
  }

  function oyuncuGuncelle(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];

    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      ix /= uz; iy /= uz;
      o.aci = Math.atan2(iy, ix);
      o.vx += ix * K.ivme * dt;
      o.vy += iy * K.ivme * dt;
    }

    o.vx -= o.vx * K.surtunme * dt;
    o.vy -= o.vy * K.surtunme * dt;
    var hiz = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (hiz > K.maxHiz) {
      o.vx = o.vx / hiz * K.maxHiz;
      o.vy = o.vy / hiz * K.maxHiz;
    }
    G.kaydir(o, o.vx * dt, o.vy * dt, K.oyuncuYaricap, d.duvarlar);

    o.bekleme = Math.max(0, o.bekleme - dt);
    if (g.space && !o.oncekiSpace && o.bekleme <= 0) omuzAt(d, koltuk, o);
    o.oncekiSpace = g.space;
  }

  // Omuz atma: menzildeki herkesi dışarı savurur. Tepeyi tek başına
  // tutmanın tek yolu bu.
  function omuzAt(d, koltuk, o) {
    o.bekleme = K.omuzBeklemeSn;
    d.dalgalar.push({ x: o.x, y: o.y, omur: 0.35, renk: A.renkler[koltuk] });
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var b = d.oyuncular[k];
      var dx = b.x - o.x, dy = b.y - o.y;
      var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
      if (uz > K.omuzMenzil) continue;
      var guc = K.omuzGuc * (1 - uz / K.omuzMenzil * 0.4);
      b.vx += (dx / uz) * guc;
      b.vy += (dy / uz) * guc;
    }
    MG.ses.firlat();
  }

  function carpismalar(d) {
    var ks = Object.keys(d.oyuncular);
    for (var i = 0; i < ks.length; i++) {
      for (var j = i + 1; j < ks.length; j++) {
        var a = d.oyuncular[ks[i]], b = d.oyuncular[ks[j]];
        var dx = b.x - a.x, dy = b.y - a.y;
        var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var gerek = K.oyuncuYaricap * 2;
        if (uz >= gerek) continue;

        var nx = dx / uz, ny = dy / uz;
        var it = (gerek - uz) / 2;
        a.x -= nx * it; a.y -= ny * it;
        b.x += nx * it; b.y += ny * it;

        var goreceli = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (goreceli > 0) continue;
        var darbe = -(1 + K.esneklik) * goreceli / 2;
        a.vx -= darbe * nx; a.vy -= darbe * ny;
        b.vx += darbe * nx; b.vy += darbe * ny;
      }
    }
  }

  function puanVer(d, dt) {
    var tepedekiler = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      o.tepede = tepedeMi(d, o);
      if (o.tepede) tepedekiler.push(+k);
    }
    if (!tepedekiler.length) return;
    // Puan akışı tepedekiler arasında BÖLÜŞÜLÜR. Herkese tam puan verilince
    // beşi birden tepede oturuyordu ve itişmenin hiçbir anlamı kalmıyordu;
    // şimdi tek başına tutmak beş kat değerli.
    var pay = K.puanHizi / tepedekiler.length;
    for (var i = 0; i < tepedekiler.length; i++) {
      d.skor[tepedekiler[i]] += pay * dt;
    }
  }

  // --- sonuç ---------------------------------------------------------------

  function siralama(d) {
    return Object.keys(d.oyuncular).map(Number).sort(function (a, b) {
      return (d.skor[b] || 0) - (d.skor[a] || 0);
    });
  }

  function bitti(d) {
    if (d.kalan > 0) return null;
    var s = siralama(d);
    if (!s.length) return { kazanan: null };
    if (s.length > 1 && Math.round(d.skor[s[0]]) === Math.round(d.skor[s[1]])) {
      return { kazanan: null };
    }
    return { kazanan: s[0] };
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = Math.round(d.skor[k] || 0) + ' sn';
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
    delete d.skor[koltuk];
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y),
               Math.round(o.aci * 100) / 100,
               Math.round(d.skor[k] || 0), Math.round(o.bekleme * 10) / 10]);
    }
    return {
      oy: oy,
      tp: [Math.round(d.tepe.x), Math.round(d.tepe.y)],
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;
    d.tepe.hx = s.tp[0]; d.tepe.hy = s.tp[1];
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncekiBekleme = o.bekleme;
      o.hx = v[1]; o.hy = v[2]; o.aci = v[3];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      d.skor[v[0]] = v[4];
      o.bekleme = v[5];
      // Bekleme sıfırdan tavana çıktıysa omuz atmıştır
      if (o.bekleme > oncekiBekleme + 0.5) {
        d.dalgalar.push({ x: o.x, y: o.y, omur: 0.35, renk: A.renkler[v[0]] });
        MG.ses.firlat();
      }
      o.tepede = tepedeMi(d, o);
    }
  }

  function efekt(d, dt) {
    if (d.uzak) {
      var hz = A.yayin.yumusatmaHizi;
      for (var k in d.oyuncular) MG.yumusat.nokta(d.oyuncular[k], dt, hz);
      d.tepe.x += (d.tepe.hx - d.tepe.x) * Math.min(1, dt * 6);
      d.tepe.y += (d.tepe.hy - d.tepe.y) * Math.min(1, dt * 6);
    }
    for (var i = d.dalgalar.length - 1; i >= 0; i--) {
      d.dalgalar[i].omur -= dt;
      if (d.dalgalar[i].omur <= 0) d.dalgalar.splice(i, 1);
    }
  }

  return {
    id: 'kral',
    ad: 'Kral Tepesi',
    kurallar: 'WASD ya da oklar: koş · Boşluk: omuz at · Tepede durduğun her saniye puan',
    tepedeMi: tepedeMi,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.kralCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
