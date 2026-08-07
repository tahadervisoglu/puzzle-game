// Renk Kapma — 30 saniye boyunca zemini kendi renginle boya.
// Üstünden geçtiğin kare senin olur, rakibin boyasının üstünden geçersen
// onu da alırsın. Kimse elenmez: herkes son saniyeye kadar oyunda kalır,
// en çok alanı boyayan kazanır.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.boya = (function () {
  var A = MG.ayar;
  var Y = A.boya;
  var W = A.dunya.w, H = A.dunya.h;

  var SUTUN = Math.floor(W / Y.hucre);
  var SATIR = Math.floor(H / Y.hucre);

  function indeks(cx, cy) { return cy * SUTUN + cx; }

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      // 0 = boyasız, aksi halde (koltuk + 1)
      zemin: new Uint8Array(SUTUN * SATIR),
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      skor: {},
      kalan: Y.turSureSn
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
        x: W / 2 + Math.cos(a) * (W * 0.3),
        y: H / 2 + Math.sin(a) * (H * 0.3)
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      d.skor[s] = 0;
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0, hedef: null };
      boya(d, s, d.oyuncular[s].x, d.oyuncular[s].y);
    }
    skorlariSay(d);
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // Fırça yarıçapındaki bütün hücreler boyanır; kimin olduğuna bakılmaz,
  // rakibin boyası da devralınır.
  function boya(d, koltuk, x, y) {
    var r = Y.firca;
    var cx0 = Math.floor((x - r) / Y.hucre), cx1 = Math.floor((x + r) / Y.hucre);
    var cy0 = Math.floor((y - r) / Y.hucre), cy1 = Math.floor((y + r) / Y.hucre);
    for (var cy = cy0; cy <= cy1; cy++) {
      if (cy < 0 || cy >= SATIR) continue;
      for (var cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cx >= SUTUN) continue;
        var mx = cx * Y.hucre + Y.hucre / 2 - x;
        var my = cy * Y.hucre + Y.hucre / 2 - y;
        if (mx * mx + my * my > r * r) continue;
        d.zemin[indeks(cx, cy)] = koltuk + 1;
      }
    }
  }

  function skorlariSay(d) {
    for (var k in d.oyuncular) d.skor[k] = 0;
    for (var i = 0; i < d.zemin.length; i++) {
      var v = d.zemin[i];
      if (v && d.skor[v - 1] != null) d.skor[v - 1]++;
    }
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      if (d.botDurum[k]) MG.boyaBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, dt);
    }
    // Skor için 1000 hücreyi her karede taramak gereksiz yük; saniyede on
    // kez saymak hem şeridi hem tabloyu güncel tutuyor.
    d.sayimBirikim = (d.sayimBirikim || 0) + dt;
    if (d.sayimBirikim >= 0.1 || d.kalan <= 0) {
      d.sayimBirikim = 0;
      skorlariSay(d);
    }
  }

  function oyuncuGuncelle(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      o.x += (ix / uz) * Y.hiz * dt;
      o.y += (iy / uz) * Y.hiz * dt;
      var r = Y.oyuncuYaricap;
      o.x = Math.max(r, Math.min(W - r, o.x));
      o.y = Math.max(r, Math.min(H - r, o.y));
    }
    boya(d, koltuk, o.x, o.y);
  }

  // Boyama tahmine dahil: zemin ağdan gelmiyor, her istemci konumlardan
  // kendisi boyuyor. Yani burada boyamak kalıcı sunucu durumunu bozmaz,
  // aksine fırçanın tuşla birlikte hareket etmesini sağlar.
  function tahmin(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    if (!o) return;
    oyuncuGuncelle(d, koltuk, dt);
    MG.tahmin.pozKaydet(o, MG.simdi());
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
    // Tam eşitlikte kazanan yok
    if (s.length > 1 && d.skor[s[0]] === d.skor[s[1]]) return { kazanan: null };
    return { kazanan: s[0] };
  }

  function yuzde(d, koltuk) {
    return Math.round((d.skor[koltuk] || 0) / d.zemin.length * 100);
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = '%' + yuzde(d, k);
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
    delete d.skor[koltuk];
  }

  // --- ağ ------------------------------------------------------------------
  // Zemin (1000 hücre) yayınlanmaz — misafir gelen konumlardan kendisi boyar.
  // Skor yine de oda sahibinden gelir, tabloda herkes aynı sayıyı görsün.

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y), d.skor[k] || 0]);
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
      if (v[0] === d.tahminKoltuk) {
        // Kendi izimizi tahmin ederken zaten boyadık; burada tekrar boyamak
        // geriye doğru sahte bir şerit çizerdi.
        MG.tahmin.duzelt(o, v[1], v[2], null, d.gecikmeMs || 0);
      } else {
        // İki paket arasını da boya, yoksa iz kesik kesik kalır
        izDoldur(d, v[0], o.x, o.y, v[1], v[2]);
        o.hx = v[1]; o.hy = v[2];
        if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.ilkPaket = 1; }
      }
      d.skor[v[0]] = v[3];
    }
  }

  function izDoldur(d, koltuk, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var uz = Math.sqrt(dx * dx + dy * dy);
    if (uz > W / 2) return;            // yeni tur ya da ışınlanma
    var n = Math.max(1, Math.ceil(uz / (Y.hucre / 2)));
    for (var i = 0; i <= n; i++) {
      boya(d, koltuk, x1 + dx * i / n, y1 + dy * i / n);
    }
  }

  function efekt(d, dt) {
    if (!d.uzak) return;
    var hz = A.yayin.yumusatmaHizi;
    for (var k in d.oyuncular) {
      if (+k === d.tahminKoltuk) { MG.tahmin.erit(d.oyuncular[k], dt); continue; }
      MG.yumusat.nokta(d.oyuncular[k], dt, hz);
    }
  }

  return {
    id: 'boya',
    ad: 'Renk Kapma',
    kurallar: 'WASD ya da oklar: koş · Geçtiğin yer senin olur · 30 sn’de en çok alan kazanır',
    sutun: SUTUN, satir: SATIR, indeks: indeks, yuzde: yuzde,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    tahmin: tahmin,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.boyaCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
