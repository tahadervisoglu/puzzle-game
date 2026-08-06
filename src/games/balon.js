// Balon Düellosu — herkesin başının üstünde balonlar var, ayakların silah.
// Rakibin üstüne düşersen bir balonunu patlatırsın; üç balonu da giden
// elenir. Havuzdaki tek dikey dövüş: yükseklik avantajı her şey.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.balon = (function () {
  var A = MG.ayar;
  var B = A.balon;
  var W = A.dunya.w, H = A.dunya.h;

  // Elle çizilmiş platform katları. Zemin hep var; üstü tohumdan seçilir.
  var DUZENLER = [
    [ // simetrik üç kat
      { x: 90, y: 350, w: 180 }, { x: 530, y: 350, w: 180 },
      { x: 300, y: 250, w: 200 },
      { x: 120, y: 155, w: 150 }, { x: 530, y: 155, w: 150 }
    ],
    [ // merdiven
      { x: 60, y: 360, w: 200 }, { x: 330, y: 300, w: 170 },
      { x: 570, y: 240, w: 180 }, { x: 250, y: 160, w: 160 }
    ],
    [ // kule
      { x: 300, y: 360, w: 200 }, { x: 90, y: 285, w: 150 },
      { x: 560, y: 285, w: 150 }, { x: 320, y: 195, w: 160 },
      { x: 150, y: 130, w: 120 }, { x: 530, y: 130, w: 120 }
    ]
  ];

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var duzen = DUZENLER[Math.floor(rng() * DUZENLER.length)];
    var platformlar = [{ x: 0, y: 452, w: W }].concat(duzen);

    var d = {
      rng: rng,
      platformlar: platformlar,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      elenenler: [],
      parcalar: [],
      kalan: B.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var p = platformlar[i % platformlar.length];
      d.oyuncular[s] = {
        x: p.x + p.w / 2 + (i - oturanlar.length / 2) * 40,
        y: p.y - B.oyuncuYaricap - 2,
        vx: 0, vy: 0,
        yerde: false, bakis: 1,
        balon: B.balonSayisi,
        dokunulmazlik: 0,
        oncekiSpace: false,
        canli: true
      };
      d.oyuncular[s].x = Math.max(30, Math.min(W - 30, d.oyuncular[s].x));
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0, hedef: null };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // Balon yığınının tepesi — vuruş kontrolü buna bakıyor
  function balonUstu(o) {
    return o.y - B.oyuncuYaricap - o.balon * B.balonYaricap * 1.7;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) continue;
      if (d.botDurum[k]) MG.balonBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, o, dt);
    }
    vuruslar(d);
  }

  function oyuncuGuncelle(d, koltuk, o, dt) {
    var g = d.girdiler[koltuk];
    o.dokunulmazlik = Math.max(0, o.dokunulmazlik - dt);

    var yon = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    if (yon) {
      o.bakis = yon;
      var kontrol = o.yerde ? 1 : B.havaKontrol;
      o.vx += (yon * B.hiz - o.vx) * Math.min(1, dt * 12 * kontrol);
    } else if (o.yerde) {
      o.vx -= o.vx * Math.min(1, dt * 12);
    }

    // Zıplama: yalnızca yerdeyken, basma anında
    if (g.space && !o.oncekiSpace && o.yerde) {
      o.vy = -B.zipHiz;
      o.yerde = false;
      MG.ses.zipla();
    }
    o.oncekiSpace = g.space;

    o.vy += B.yercekimi * dt;
    o.x += o.vx * dt;
    var oncekiAlt = o.y + B.oyuncuYaricap;
    o.y += o.vy * dt;

    var r = B.oyuncuYaricap;
    o.x = Math.max(r, Math.min(W - r, o.x));
    platformCarpismasi(d, o, oncekiAlt);

    // Alta düşerse zemin platformu zaten yakalar; yine de sınır koy
    if (o.y > H + 60) { o.y = H + 60; o.vy = 0; }
  }

  // Tek yönlü platform: alttan zıplayınca geçilir, üstüne düşünce durulur.
  function platformCarpismasi(d, o, oncekiAlt) {
    o.yerde = false;
    if (o.vy < 0) return;
    var alt = o.y + B.oyuncuYaricap;
    for (var i = 0; i < d.platformlar.length; i++) {
      var p = d.platformlar[i];
      if (o.x < p.x - 4 || o.x > p.x + p.w + 4) continue;
      if (oncekiAlt <= p.y + 1 && alt >= p.y) {
        o.y = p.y - B.oyuncuYaricap;
        o.vy = 0;
        o.yerde = true;
        return;
      }
    }
  }

  // Vuruş: birinin ayakları, ötekinin balon yığınına yukarıdan değerse.
  function vuruslar(d) {
    var ks = Object.keys(d.oyuncular);
    for (var i = 0; i < ks.length; i++) {
      for (var j = 0; j < ks.length; j++) {
        if (i === j) continue;
        var a = d.oyuncular[ks[i]], b = d.oyuncular[ks[j]];
        if (!a.canli || !b.canli || b.dokunulmazlik > 0) continue;
        if (a.vy <= 0) continue;                        // yukarı çıkarken vuramaz
        // Yatay tolerans dar tutulunca üstüne denk gelmek neredeyse
        // imkânsızdı; balon yığını gövdeden geniş sayılıyor.
        if (Math.abs(a.x - b.x) > B.oyuncuYaricap * 1.5 + B.balonYaricap) continue;

        var ayak = a.y + B.oyuncuYaricap;
        var tepe = balonUstu(b);
        if (ayak < tepe - 6 || ayak > b.y - B.oyuncuYaricap * 0.2) continue;

        patlat(d, +ks[j], b);
        a.vy = -B.sekmeHiz;                             // patlatan seker
        a.yerde = false;
      }
    }
  }

  function patlat(d, koltuk, o) {
    o.balon--;
    o.dokunulmazlik = B.dokunulmazlikSn;
    o.vy = -B.sekmeHiz * 0.45;                          // geri tepme
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      d.parcalar.push({
        x: o.x, y: balonUstu(o) + B.balonYaricap,
        vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
        omur: 0.35 + Math.random() * 0.3, renk: A.renkler[koltuk]
      });
    }
    MG.ses.patlama();
    if (o.balon > 0) return;
    o.canli = false;
    if (d.elenenler.indexOf(koltuk) < 0) d.elenenler.push(koltuk);
  }

  // --- sonuç ---------------------------------------------------------------

  function canlilar(d) {
    var l = [];
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].canli) l.push(+k);
    }
    return l;
  }

  function bitti(d) {
    var l = canlilar(d);
    if (l.length === 1) return { kazanan: l[0] };
    if (l.length === 0) return { kazanan: null };
    if (d.kalan <= 0) {
      // Süre dolduysa en çok balonu kalan kazanır
      var s = siralama(d);
      if (s.length > 1 && d.oyuncular[s[0]].balon === d.oyuncular[s[1]].balon) {
        return { kazanan: null };
      }
      return { kazanan: s[0] };
    }
    return null;
  }

  function siralama(d) {
    var canli = canlilar(d).sort(function (a, b) {
      return d.oyuncular[b].balon - d.oyuncular[a].balon;
    });
    return canli.concat(d.elenenler.slice().reverse());
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) {
      o[k] = d.oyuncular[k].canli ? d.oyuncular[k].balon + ' balon' : 'patladı';
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

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y), o.balon,
               o.canli ? 1 : 0, Math.round(o.dokunulmazlik * 10) / 10,
               o.bakis, o.yerde ? 1 : 0]);
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
      var oncekiBalon = o.balon;
      o.hx = v[1]; o.hy = v[2];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      o.balon = v[3];
      o.canli = v[4] === 1;
      o.dokunulmazlik = v[5];
      o.bakis = v[6];
      o.yerde = v[7] === 1;
      if (o.balon < oncekiBalon) patlamaEfekti(d, v[0], o);
    }
  }

  function patlamaEfekti(d, koltuk, o) {
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      d.parcalar.push({
        x: o.x, y: balonUstu(o) + B.balonYaricap,
        vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
        omur: 0.35 + Math.random() * 0.3, renk: A.renkler[koltuk]
      });
    }
    MG.ses.patlama();
  }

  function efekt(d, dt) {
    if (d.uzak) {
      var hz = A.yayin.yumusatmaHizi;
      for (var k in d.oyuncular) MG.yumusat.nokta(d.oyuncular[k], dt, hz);
    }
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 320 * dt;
    }
  }

  return {
    id: 'balon',
    ad: 'Balon Düellosu',
    kurallar: 'A / D ya da ← →: koş · Boşluk: zıpla · Rakibin balonuna üstünden bas',
    balonUstu: balonUstu,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.balonCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
