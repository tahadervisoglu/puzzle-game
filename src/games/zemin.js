// Zemin Çöküyor — bastığın altıgen bir saniye sonra çöker, altında boşluk var.
// Durmak yok: kendi bastığın karolar arkanda yok olur, zemin sürekli erir.
// Boşluğa düşen elenir, son ayakta kalan kazanır.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.zemin = (function () {
  var A = MG.ayar;
  var Z = A.zemin;
  var W = A.dunya.w, H = A.dunya.h;

  // Karo durumları
  var SAGLAM = 0, CATLAK = 1, DUSUYOR = 2, YOK = 3;

  // Düz tepeli altıgen: yatayda 1.5*R, dikeyde sqrt(3)*R aralık
  var YATAY = Z.yaricap * 1.5;
  var DIKEY = Z.yaricap * Math.sqrt(3);
  var SUTUN = Math.floor((W - 40) / YATAY);
  var SATIR = Math.floor((H - 50) / DIKEY);
  var OFS = {
    x: (W - (SUTUN - 1) * YATAY) / 2,
    y: (H - (SATIR - 1) * DIKEY) / 2
  };

  function merkezX(q) { return OFS.x + q * YATAY; }
  function merkezY(q, r) { return OFS.y + r * DIKEY + (q % 2 ? DIKEY / 2 : 0); }
  function indeks(q, r) { return r * SUTUN + q; }

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      karolar: [],
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      elenenler: [],
      parcalar: [],
      gecen: 0,
      kalan: Z.turSureSn
    };

    for (var r = 0; r < SATIR; r++) {
      for (var q = 0; q < SUTUN; q++) {
        // Son sütun tek numaralıysa yarım kayıp taşar, onu atla
        var tasiyor = (q % 2 === 1 && r === SATIR - 1);
        d.karolar.push({
          q: q, r: r,
          x: merkezX(q), y: merkezY(q, r),
          durum: tasiyor ? YOK : SAGLAM,
          sayac: 0
        });
      }
    }

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    // Zeminin ortasına çember şeklinde diz
    var bas = rng() * Math.PI * 2;
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var a = bas + (i / oturanlar.length) * Math.PI * 2;
      // Geniş dağıt: merkeze toplanınca beşi aynı karoları tüketip zemini
      // saniyeler içinde eritiyordu.
      d.oyuncular[s] = {
        x: W / 2 + Math.cos(a) * (W * 0.34),
        y: H / 2 + Math.sin(a) * (H * 0.34),
        canli: true, dusme: 0
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0, hedef: null };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // Bir noktanın üstünde durduğu karo. Aday alan dar olduğu için tüm
  // karoları taramak yerine yaklaşık sütun/satırdan gidiyoruz.
  function karoBul(d, x, y) {
    var q0 = Math.round((x - OFS.x) / YATAY);
    var enIyi = null, enAz = Z.yaricap * Z.yaricap;
    for (var q = q0 - 1; q <= q0 + 1; q++) {
      if (q < 0 || q >= SUTUN) continue;
      var r0 = Math.round((y - OFS.y - (q % 2 ? DIKEY / 2 : 0)) / DIKEY);
      for (var r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= SATIR) continue;
        var kr = d.karolar[indeks(q, r)];
        if (!kr) continue;
        var dx = kr.x - x, dy = kr.y - y;
        var u = dx * dx + dy * dy;
        if (u < enAz) { enAz = u; enIyi = kr; }
      }
    }
    return enIyi;
  }

  function basilabilir(kr) {
    return kr && (kr.durum === SAGLAM || kr.durum === CATLAK);
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function catlamaSuresi(d) {
    var azalma = Math.floor(d.gecen / Z.zorlukSn) * Z.zorlukAzalma;
    return Math.max(Z.catlamaEnAz, Z.catlamaSn - azalma);
  }

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    d.gecen += dt;

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) { o.dusme = Math.min(1, o.dusme + dt / Z.oyuncuDusmeSn); continue; }
      if (d.botDurum[k]) MG.zeminBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, o, dt);
    }
    karolariGuncelle(d, dt);
  }

  function oyuncuGuncelle(d, koltuk, o, dt) {
    var g = d.girdiler[koltuk];
    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      o.x += (ix / uz) * Z.hiz * dt;
      o.y += (iy / uz) * Z.hiz * dt;
      o.x = Math.max(0, Math.min(W, o.x));
      o.y = Math.max(0, Math.min(H, o.y));
    }

    var kr = karoBul(d, o.x, o.y);
    if (!basilabilir(kr)) return dus(d, koltuk, o);

    // Üstüne basılan sağlam karo çatlamaya başlar
    if (kr.durum === SAGLAM) {
      kr.durum = CATLAK;
      kr.sayac = catlamaSuresi(d);
    }
  }

  function karolariGuncelle(d, dt) {
    for (var i = 0; i < d.karolar.length; i++) {
      var kr = d.karolar[i];
      if (kr.durum === CATLAK) {
        kr.sayac -= dt;
        if (kr.sayac <= 0) { kr.durum = DUSUYOR; kr.sayac = Z.dusmeSn; }
      } else if (kr.durum === DUSUYOR) {
        kr.sayac -= dt;
        if (kr.sayac <= 0) kr.durum = YOK;
      }
    }
  }

  function dus(d, koltuk, o) {
    o.canli = false;
    o.dusme = 0;
    if (d.elenenler.indexOf(koltuk) < 0) d.elenenler.push(koltuk);
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2;
      d.parcalar.push({
        x: o.x, y: o.y,
        vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
        omur: 0.4 + Math.random() * 0.3
      });
    }
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
    for (var k in d.oyuncular) o[k] = d.oyuncular[k].canli ? 'ayakta' : 'düştü';
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
  // Karo durumları 2 bit'e sığıyor; 15 sayıya paketlenip gönderiliyor.
  // Çatlama sayacı yayınlanmaz, misafir durum değişimini görünce kendi başlatır.

  function durumPaketi(d) {
    var m = [];
    for (var i = 0; i < d.karolar.length; i++) {
      var blok = (i / 15) | 0;
      if (m[blok] == null) m[blok] = 0;
      m[blok] |= (d.karolar[i].durum & 3) << ((i % 15) * 2);
    }
    return m;
  }

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y), o.canli ? 1 : 0]);
    }
    return { oy: oy, ka: Math.round(d.kalan * 10) / 10, kr: durumPaketi(d) };
  }

  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;

    for (var i = 0; i < d.karolar.length; i++) {
      var blok = (i / 15) | 0;
      var yeni = s.kr[blok] == null ? YOK : (s.kr[blok] >> ((i % 15) * 2)) & 3;
      var kr = d.karolar[i];
      if (kr.durum === yeni) continue;
      kr.durum = yeni;
      // Sayaçlar yerelde işletiliyor: karo aynı ritimde titreyip çöksün
      if (yeni === CATLAK) kr.sayac = Z.catlamaSn;
      else if (yeni === DUSUYOR) kr.sayac = Z.dusmeSn;
    }

    for (i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncedenCanli = o.canli;
      o.hx = v[1]; o.hy = v[2];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      o.canli = v[3] === 1;
      if (oncedenCanli && !o.canli) { o.dusme = 0; MG.ses.dusme(); }
    }
  }

  function efekt(d, dt) {
    if (d.uzak) {
      var hz = A.yayin.yumusatmaHizi;
      for (var k in d.oyuncular) {
        var o = d.oyuncular[k];
        if (o.canli) MG.yumusat.nokta(o, dt, hz);
      }
      // Sayaçlar misafirde de işlesin ki karo titremesi doğru görünsün
      for (var i = 0; i < d.karolar.length; i++) {
        if (d.karolar[i].sayac > 0) d.karolar[i].sayac -= dt;
      }
    }
    for (var j in d.oyuncular) {
      var p = d.oyuncular[j];
      if (!p.canli) p.dusme = Math.min(1, p.dusme + dt / Z.oyuncuDusmeSn);
    }
    for (var i2 = d.parcalar.length - 1; i2 >= 0; i2--) {
      var pa = d.parcalar[i2];
      pa.omur -= dt;
      if (pa.omur <= 0) { d.parcalar.splice(i2, 1); continue; }
      pa.x += pa.vx * dt; pa.y += pa.vy * dt;
      pa.vy += 260 * dt;
    }
  }

  return {
    id: 'zemin',
    ad: 'Zemin Çöküyor',
    kurallar: 'WASD ya da oklar: koş · Bastığın karo çöker, durmak yok · Son ayakta kalan kazanır',
    SAGLAM: SAGLAM, CATLAK: CATLAK, DUSUYOR: DUSUYOR, YOK: YOK,
    yaricap: Z.yaricap,
    karoBul: karoBul, basilabilir: basilabilir,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.zeminCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
