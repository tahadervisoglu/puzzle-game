// Bomba Kaos — ızgarada bomba bırak, haç şeklinde patlat, son kalan kazanır.
//
// Kırılan kutulardan bonus çıkar (bomba sayısı, menzil, hız). Alev başka bir
// bombaya değerse onu da patlatır — zincirleme patlama bu oyunun tuzu biberi
// ve kendi bombanla ölmek serbesttir.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.bomba = (function () {
  var A = MG.ayar;
  var B = A.bomba;
  var I = MG.bombaIzgara;

  var BONUSLAR = ['bomba', 'menzil', 'hiz'];

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      hucreler: I.haritaUret(rng),
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      bombalar: [],
      alevler: [],
      bonuslar: [],
      elenenler: [],
      parcalar: [],
      kalan: B.turSureSn
    };

    var s = 0;
    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      var dg = I.doguslar[s++ % I.doguslar.length];
      d.oyuncular[k] = {
        x: I.merkezX(dg[0]), y: I.merkezY(dg[1]),
        canli: true,
        maxBomba: B.baslangicBomba,
        menzil: B.baslangicMenzil,
        hiz: B.hiz,
        muaf: null      // üstünde durduğun bomba: çıkana kadar geçilebilir
      };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) d.botDurum[k] = { karar: 0, yon: null };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function hucre(d, cx, cy) {
    if (!I.icinde(cx, cy)) return I.SERT;
    return d.hucreler[I.indeks(cx, cy)];
  }

  function bombaBul(d, cx, cy) {
    for (var i = 0; i < d.bombalar.length; i++) {
      if (d.bombalar[i].cx === cx && d.bombalar[i].cy === cy) return d.bombalar[i];
    }
    return null;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      if (!d.oyuncular[k].canli) continue;
      if (d.botDurum[k]) MG.bombaBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, dt);
    }
    bombalariGuncelle(d, dt);
    alevleriGuncelle(d, dt);
  }

  function oyuncuGuncelle(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];

    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    // Aynı anda iki yön basılıysa yatayı öncele — köşe dönüşü net olsun
    if (ix && iy) iy = 0;
    if (ix || iy) hareket(d, o, ix, iy, dt);

    // Muafiyet, GÖVDE bomba hücresini tamamen terk edince biter. Yalnızca
    // merkeze bakmak yetmiyordu: merkez komşu hücreye geçtiği anda muafiyet
    // kalkıyor, ama köşeler hâlâ bombanın hücresinde kaldığı için oyuncu
    // kendi bombasına takılıp kalıyordu.
    if (o.muaf && hucreyiTerkEtti(o, o.muaf)) o.muaf = null;

    if (g.space) bombaBirak(d, koltuk, o);
    bonusTopla(d, o);
    alevKontrol(d, koltuk, o);
  }

  // Izgara oyununda hareket: engellenen eksende hücre merkezine doğru
  // hizalanır. Bu "köşe yardımı" olmadan dar koridorlara girmek işkence.
  function hareket(d, o, ix, iy, dt) {
    var adim = o.hiz * dt;
    if (ix) {
      if (gecebilir(d, o, o.x + ix * adim, o.y)) o.x += ix * adim;
      else hizala(o, 'y', I.merkezY(I.hucreY(o.y)), adim);
    }
    if (iy) {
      if (gecebilir(d, o, o.x, o.y + iy * adim)) o.y += iy * adim;
      else hizala(o, 'x', I.merkezX(I.hucreX(o.x)), adim);
    }
  }

  function hizala(o, eksen, hedef, adim) {
    var fark = hedef - o[eksen];
    if (Math.abs(fark) < 0.5) return;
    o[eksen] += (fark > 0 ? 1 : -1) * Math.min(adim, Math.abs(fark));
  }

  // Oyuncunun kapladığı karenin hiçbir köşesi o hücrede kalmadı mı?
  function hucreyiTerkEtti(o, b) {
    var r = B.oyuncuYaricap;
    var noktalar = [[o.x - r, o.y - r], [o.x + r, o.y - r],
                    [o.x - r, o.y + r], [o.x + r, o.y + r]];
    for (var i = 0; i < 4; i++) {
      if (I.hucreX(noktalar[i][0]) === b.cx && I.hucreY(noktalar[i][1]) === b.cy) {
        return false;
      }
    }
    return true;
  }

  // Oyuncunun kapladığı kare hangi hücrelere değiyor?
  function gecebilir(d, o, x, y) {
    var r = B.oyuncuYaricap;
    var noktalar = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
    for (var i = 0; i < 4; i++) {
      var cx = I.hucreX(noktalar[i][0]), cy = I.hucreY(noktalar[i][1]);
      if (hucre(d, cx, cy) !== I.BOS) return false;
      var b = bombaBul(d, cx, cy);
      if (b && b !== o.muaf) return false;
    }
    return true;
  }

  function bombaBirak(d, koltuk, o) {
    var cx = I.hucreX(o.x), cy = I.hucreY(o.y);
    if (hucre(d, cx, cy) !== I.BOS || bombaBul(d, cx, cy)) return;
    var sayi = 0;
    for (var i = 0; i < d.bombalar.length; i++) {
      if (d.bombalar[i].sahip === koltuk) sayi++;
    }
    if (sayi >= o.maxBomba) return;

    var b = { cx: cx, cy: cy, sahip: koltuk, fitil: B.fitilSn, menzil: o.menzil };
    d.bombalar.push(b);
    o.muaf = b;   // üstünde duruyor, çıkana kadar geçebilsin
    MG.ses.yapis();
  }

  function bombalariGuncelle(d, dt) {
    for (var i = d.bombalar.length - 1; i >= 0; i--) {
      d.bombalar[i].fitil -= dt;
      if (d.bombalar[i].fitil <= 0) patlat(d, i);
    }
  }

  function patlat(d, dizin) {
    var b = d.bombalar[dizin];
    d.bombalar.splice(dizin, 1);
    var o = d.oyuncular[b.sahip];
    if (o && o.muaf === b) o.muaf = null;

    alevEkle(d, b.cx, b.cy);
    var yonler = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var y = 0; y < 4; y++) {
      for (var m = 1; m <= b.menzil; m++) {
        var cx = b.cx + yonler[y][0] * m, cy = b.cy + yonler[y][1] * m;
        var h = hucre(d, cx, cy);
        if (h === I.SERT) break;
        alevEkle(d, cx, cy);
        if (h === I.KUTU) { kutuKir(d, cx, cy); break; }
      }
    }
    d.sarsinti = 0.25;
    MG.ses.patlama();
  }

  function alevEkle(d, cx, cy) {
    d.alevler.push({ cx: cx, cy: cy, omur: B.alevOmurSn });
    // Zincirleme: alevin bastığı bomba hemen patlar
    var b = bombaBul(d, cx, cy);
    if (b) b.fitil = Math.min(b.fitil, 0.001);
    // Yerdeki bonus alevde yanar
    for (var i = d.bonuslar.length - 1; i >= 0; i--) {
      if (d.bonuslar[i].cx === cx && d.bonuslar[i].cy === cy) d.bonuslar.splice(i, 1);
    }
  }

  function kutuKir(d, cx, cy) {
    d.hucreler[I.indeks(cx, cy)] = I.BOS;
    for (var i = 0; i < 8; i++) {
      d.parcalar.push({
        x: I.merkezX(cx), y: I.merkezY(cy),
        vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160,
        omur: 0.35 + Math.random() * 0.3
      });
    }
    if (d.rng() < B.bonusOran) {
      d.bonuslar.push({
        cx: cx, cy: cy,
        tip: BONUSLAR[Math.floor(d.rng() * BONUSLAR.length)]
      });
    }
  }

  function alevleriGuncelle(d, dt) {
    for (var i = d.alevler.length - 1; i >= 0; i--) {
      d.alevler[i].omur -= dt;
      if (d.alevler[i].omur <= 0) d.alevler.splice(i, 1);
    }
  }

  function alevKontrol(d, koltuk, o) {
    var cx = I.hucreX(o.x), cy = I.hucreY(o.y);
    for (var i = 0; i < d.alevler.length; i++) {
      if (d.alevler[i].cx === cx && d.alevler[i].cy === cy) return oldur(d, koltuk, o);
    }
  }

  function oldur(d, koltuk, o) {
    o.canli = false;
    if (d.elenenler.indexOf(koltuk) < 0) d.elenenler.push(koltuk);
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * Math.PI * 2;
      var h = 40 + Math.random() * 150;
      d.parcalar.push({
        x: o.x, y: o.y, vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.4, renk: A.renkler[koltuk]
      });
    }
    MG.ses.dusme();
  }

  function bonusTopla(d, o) {
    var cx = I.hucreX(o.x), cy = I.hucreY(o.y);
    for (var i = d.bonuslar.length - 1; i >= 0; i--) {
      var bo = d.bonuslar[i];
      if (bo.cx !== cx || bo.cy !== cy) continue;
      if (bo.tip === 'bomba') o.maxBomba = Math.min(B.maxBomba, o.maxBomba + 1);
      else if (bo.tip === 'menzil') o.menzil = Math.min(B.maxMenzil, o.menzil + 1);
      else o.hiz = Math.min(B.maxHiz, o.hiz + B.hizBonusu);
      d.bonuslar.splice(i, 1);
      MG.ses.kap();
    }
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
    if (d.kalan <= 0) return { kazanan: null };
    return null;
  }

  function siralama(d) {
    return canlilar(d).concat(d.elenenler.slice().reverse());
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = d.oyuncular[k].canli ? 'hayatta' : 'patladı';
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
      oy.push([+k, Math.round(o.x), Math.round(o.y), o.canli ? 1 : 0,
               o.maxBomba, o.menzil, Math.round(o.hiz)]);
    }
    return {
      oy: oy,
      bo: d.bombalar.map(function (b) {
        return [b.cx, b.cy, Math.round(b.fitil * 10) / 10, b.menzil];
      }),
      al: d.alevler.map(function (a) { return [a.cx, a.cy]; }),
      bn: d.bonuslar.map(function (b) { return [b.cx, b.cy, BONUSLAR.indexOf(b.tip)]; }),
      ku: I.kutuMaskesi(d.hucreler),
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;
    I.maskeyiUygula(d.hucreler, s.ku);

    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncedenCanli = o.canli;
      o.hx = v[1]; o.hy = v[2];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      o.canli = v[3] === 1;
      o.maxBomba = v[4]; o.menzil = v[5]; o.hiz = v[6];
      if (oncedenCanli && !o.canli) oldurEfekt(d, v[0], o);
    }

    var oncekiAlev = d.alevler.length;
    d.bombalar = s.bo.map(function (b) {
      return { cx: b[0], cy: b[1], fitil: b[2], menzil: b[3], sahip: -1 };
    });
    d.alevler = s.al.map(function (a) {
      return { cx: a[0], cy: a[1], omur: B.alevOmurSn };
    });
    d.bonuslar = s.bn.map(function (b) {
      return { cx: b[0], cy: b[1], tip: BONUSLAR[b[2]] };
    });
    if (d.alevler.length > oncekiAlev) { d.sarsinti = 0.25; MG.ses.patlama(); }
  }

  function oldurEfekt(d, koltuk, o) {
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * Math.PI * 2;
      var h = 40 + Math.random() * 150;
      d.parcalar.push({
        x: o.x, y: o.y, vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.4, renk: A.renkler[koltuk]
      });
    }
    MG.ses.dusme();
  }

  function efekt(d, dt) {
    if (d.uzak) {
      var h = A.yayin.yumusatmaHizi;
      for (var k in d.oyuncular) MG.yumusat.nokta(d.oyuncular[k], dt, h);
    }
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
    if (d.sarsinti) d.sarsinti = Math.max(0, d.sarsinti - dt);
  }

  return {
    id: 'bomba',
    ad: 'Bomba Kaos',
    kurallar: 'WASD ya da oklar: hareket · Boşluk: bomba bırak · Alevden kaç, son kalan kazanır',
    hucre: hucre,
    bombaBul: bombaBul,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.bombaCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
