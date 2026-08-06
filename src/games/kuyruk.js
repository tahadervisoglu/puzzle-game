// Kuyruk Yakala — herkesin arkasında sürüklenen bir kuyruk var. Rakibin
// kuyruk ucuna dokunursan bir kuyruğunu koparıp kendine eklersin; kuyruksuz
// kalan elenir.
//
// Kuyruk uzadıkça yavaşlarsın: önde giden aynı zamanda en kolay avdır.
// Kovalamakla kaçmak bu yüzden aynı anda oluyor.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.kuyruk = (function () {
  var A = MG.ayar;
  var Q = A.kuyruk;
  var G = MG.geo;
  var W = A.dunya.w, H = A.dunya.h;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      duvarlar: G.cerceve(),
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      elenenler: [],
      parcalar: [],
      kalan: Q.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    var bas = rng() * Math.PI * 2;
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var a = bas + (i / oturanlar.length) * Math.PI * 2;
      var x = W / 2 + Math.cos(a) * (W * 0.3);
      var y = H / 2 + Math.sin(a) * (H * 0.3);
      d.oyuncular[s] = {
        x: x, y: y, vx: 0, vy: 0,
        aci: a + Math.PI,
        kuyruk: Q.baslangicKuyruk,
        segmentler: [],
        bekleme: 0, dokunulmazlik: 0,
        oncekiSpace: false, canli: true
      };
      segmentleriTazele(d.oyuncular[s]);
    }
    for (i = 0; i < oturanlar.length; i++) {
      d.girdiler[oturanlar[i]] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[oturanlar[i]].bot) d.botDurum[oturanlar[i]] = { karar: 0 };
    }
    return d;
  }

  // Kuyruk sayısı değişince segment listesi ona uydurulur
  function segmentleriTazele(o) {
    while (o.segmentler.length < o.kuyruk) {
      var son = o.segmentler.length
        ? o.segmentler[o.segmentler.length - 1]
        : { x: o.x, y: o.y };
      o.segmentler.push({ x: son.x, y: son.y });
    }
    while (o.segmentler.length > o.kuyruk) o.segmentler.pop();
  }

  function uc(o) {
    return o.segmentler.length ? o.segmentler[o.segmentler.length - 1] : null;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function hizi(o) {
    return Math.max(Q.enAzHiz, Q.hiz - (o.kuyruk - 1) * Q.kuyrukYavaslatma);
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) continue;
      if (d.botDurum[k]) MG.kuyrukBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, o, dt);
    }
    koparmalar(d);
  }

  function oyuncuGuncelle(d, koltuk, o, dt) {
    var g = d.girdiler[koltuk];
    o.dokunulmazlik = Math.max(0, o.dokunulmazlik - dt);
    o.bekleme = Math.max(0, o.bekleme - dt);

    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      ix /= uz; iy /= uz;
      o.aci = Math.atan2(iy, ix);
      o.vx += ix * Q.ivme * dt;
      o.vy += iy * Q.ivme * dt;
    }

    // Atılma: kovalarken de kaçarken de işe yarar
    if (g.space && !o.oncekiSpace && o.bekleme <= 0) {
      o.vx += Math.cos(o.aci) * Q.atilmaHiz;
      o.vy += Math.sin(o.aci) * Q.atilmaHiz;
      o.bekleme = Q.atilmaBeklemeSn;
      MG.ses.firlat();
    }
    o.oncekiSpace = g.space;

    o.vx -= o.vx * Q.surtunme * dt;
    o.vy -= o.vy * Q.surtunme * dt;
    var h = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    var sinir = hizi(o);
    if (h > sinir && o.bekleme < Q.atilmaBeklemeSn - 0.25) {
      o.vx = o.vx / h * sinir;
      o.vy = o.vy / h * sinir;
    }
    G.kaydir(o, o.vx * dt, o.vy * dt, Q.oyuncuYaricap, d.duvarlar);
    segmentleriSurukle(o);
  }

  // Zincir: her segment bir öncekini sabit mesafede takip eder
  function segmentleriSurukle(o) {
    var onceki = { x: o.x, y: o.y };
    for (var i = 0; i < o.segmentler.length; i++) {
      var s = o.segmentler[i];
      var dx = onceki.x - s.x, dy = onceki.y - s.y;
      var uz = Math.sqrt(dx * dx + dy * dy);
      if (uz > Q.segmentMesafe) {
        var pay = (uz - Q.segmentMesafe) / uz;
        s.x += dx * pay;
        s.y += dy * pay;
      }
      onceki = s;
    }
  }

  // Koparma: gövden, rakibin kuyruk UCUNA değerse bir kuyruk el değiştirir.
  function koparmalar(d) {
    var ks = Object.keys(d.oyuncular);
    for (var i = 0; i < ks.length; i++) {
      for (var j = 0; j < ks.length; j++) {
        if (i === j) continue;
        var a = d.oyuncular[ks[i]], b = d.oyuncular[ks[j]];
        if (!a.canli || !b.canli || b.dokunulmazlik > 0 || b.kuyruk <= 0) continue;
        var u = uc(b);
        if (!u) continue;
        var dx = u.x - a.x, dy = u.y - a.y;
        var gerek = Q.oyuncuYaricap + Q.segmentYaricap;
        if (dx * dx + dy * dy > gerek * gerek) continue;
        kopar(d, +ks[i], a, +ks[j], b);
      }
    }
  }

  function kopar(d, kA, a, kB, b) {
    b.kuyruk--;
    a.kuyruk++;
    b.dokunulmazlik = Q.dokunulmazlikSn;
    segmentleriTazele(a);
    segmentleriTazele(b);
    for (var i = 0; i < 12; i++) {
      var ang = Math.random() * Math.PI * 2;
      d.parcalar.push({
        x: a.x, y: a.y,
        vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130,
        omur: 0.35 + Math.random() * 0.3, renk: A.renkler[kB]
      });
    }
    MG.ses.kap();
    if (b.kuyruk > 0) return;
    b.canli = false;
    if (d.elenenler.indexOf(kB) < 0) d.elenenler.push(kB);
    MG.ses.dusme();
  }

  // --- sonuç ---------------------------------------------------------------

  function canlilar(d) {
    var l = [];
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].canli) l.push(+k);
    }
    return l;
  }

  function siralama(d) {
    var canli = canlilar(d).sort(function (a, b) {
      return d.oyuncular[b].kuyruk - d.oyuncular[a].kuyruk;
    });
    return canli.concat(d.elenenler.slice().reverse());
  }

  function bitti(d) {
    var l = canlilar(d);
    if (l.length === 1) return { kazanan: l[0] };
    if (l.length === 0) return { kazanan: null };
    if (d.kalan <= 0) {
      var s = siralama(d);
      if (s.length > 1 && d.oyuncular[s[0]].kuyruk === d.oyuncular[s[1]].kuyruk) {
        return { kazanan: null };
      }
      return { kazanan: s[0] };
    }
    return null;
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) {
      o[k] = d.oyuncular[k].canli ? d.oyuncular[k].kuyruk + ' kuyruk' : 'elendi';
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

  // --- ağ ------------------------------------------------------------------
  // Segmentler yayınlanmaz: misafir onları oyuncu konumundan kendi sürükler.

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y),
               Math.round(o.aci * 100) / 100, o.kuyruk, o.canli ? 1 : 0,
               Math.round(o.dokunulmazlik * 10) / 10]);
    }
    return { oy: oy, ka: Math.round(d.kalan * 10) / 10 };
  }

  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncekiKuyruk = o.kuyruk;
      o.hx = v[1]; o.hy = v[2]; o.aci = v[3];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      o.kuyruk = v[4];
      o.canli = v[5] === 1;
      o.dokunulmazlik = v[6];
      if (o.kuyruk !== oncekiKuyruk) {
        segmentleriTazele(o);
        if (o.kuyruk < oncekiKuyruk) MG.ses.kap();
      }
    }
  }

  function efekt(d, dt) {
    if (d.uzak) {
      var hz = A.yayin.yumusatmaHizi;
      for (var k in d.oyuncular) MG.yumusat.nokta(d.oyuncular[k], dt, hz);
    }
    for (var j in d.oyuncular) {
      if (d.oyuncular[j].canli) segmentleriSurukle(d.oyuncular[j]);
    }
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
  }

  return {
    id: 'kuyruk',
    ad: 'Kuyruk Yakala',
    kurallar: 'WASD ya da oklar: koş · Boşluk: atıl · Rakibin kuyruk ucunu kap, kuyruksuz kalan elenir',
    uc: uc, hizi: hizi,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.kuyrukCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
