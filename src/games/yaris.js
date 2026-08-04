// Araba Yarışı — 2 tur, ilk bitiren kazanır.
// Araç hızlı ve savruk: dönüş yön vektörünü çevirir ama hız vektörü kendi
// yönünde devam eder, aradaki fark sönümlenerek drift hissini verir.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.yaris = (function () {
  var A = MG.ayar;
  var Y = A.yaris;
  var P = MG.yarisPist;
  var G = MG.geo;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      araclar: {},
      girdiler: {},
      botDurum: {},
      izler: [],          // lastik izleri (görsel)
      lastikler: lastikUret(rng),
      bitirenler: [],     // bitiriş sırası
      kalan: Y.turSureSn
    };

    var sira = 0;
    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      var yer = P.izgaraYeri(sira++);
      d.araclar[k] = {
        x: yer.x, y: yer.y, aci: yer.aci,
        vx: 0, vy: 0,
        sonNokta: 0, ilerleme: 0, bitti: false,
        cimde: false, kayma: 0
      };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) {
        d.botDurum[k] = { beceri: 0.82 + rng() * 0.16 };
      }
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // Lastik yığınları pist boyunca eşit aralıkla, merkezden yanal ofsetle
  // dizilir — hep aynı yerde olmasınlar diye ofset tohumdan gelir.
  function lastikUret(rng) {
    var n = P.noktalar.length;
    var l = [];
    for (var i = 0; i < Y.lastikSayisi; i++) {
      var idx = Math.floor(i * n / Y.lastikSayisi + rng() * 5) % n;
      var p = P.noktalar[idx];
      var s = P.noktalar[(idx + 1) % n];
      var sag = Math.atan2(s.y - p.y, s.x - p.x) + Math.PI / 2;
      var ofset = (rng() * 2 - 1) * (Y.pistGenislik * 0.33);
      l.push({ x: p.x + Math.cos(sag) * ofset, y: p.y + Math.sin(sag) * ofset });
    }
    return l;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.araclar) {
      if (d.botDurum[k]) MG.yarisBot.guncelle(d, +k, dt);
      aracGuncelle(d, +k, dt);
    }
    araclariAyir(d);
  }

  function aracGuncelle(d, koltuk, dt) {
    var a = d.araclar[koltuk];
    var g = d.araclar[koltuk].bitti ? bosGirdi : d.girdiler[koltuk];

    // Hız vektörünü araca göre ileri/yanal bileşenlerine ayır
    var fx = Math.cos(a.aci), fy = Math.sin(a.aci);
    var sx = -fy, sy = fx;
    var ileri = a.vx * fx + a.vy * fy;
    var yanal = a.vx * sx + a.vy * sy;

    if (g.w) ileri += Y.ivme * dt;
    else if (g.s) ileri -= Y.frenIvme * dt;
    else ileri -= ileri * Y.surtunme * dt;

    var yakin = P.enYakin(a.x, a.y, a.sonNokta);
    a.cimde = yakin.mesafe > Y.pistGenislik / 2;
    if (a.cimde) ileri -= ileri * Y.cimSurtunme * dt;

    var sinir = a.cimde ? Y.cimMaxHiz : Y.maxHiz;
    if (ileri > sinir) ileri = sinir;
    if (ileri < -Y.geriMaxHiz) ileri = -Y.geriMaxHiz;

    // Direksiyon hıza bağlı: duran araba dönmez, hızlandıkça tam etki eder
    var yon = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    if (yon) {
      var oran = Math.min(1, Math.abs(ileri) / (Y.maxHiz * Y.donusHizEsigi));
      var isaret = ileri < 0 ? -1 : 1;
      a.aci = G.aciNormalle(a.aci + yon * Y.donusHiz * oran * isaret * dt);
    }

    // Yanal bileşeni söndür — sönüm ne kadar azsa o kadar savrulur
    yanal *= Math.pow(Y.driftSonum, dt * 60);
    a.kayma = Math.min(1, Math.abs(yanal) / 200);

    // Yeni açıyla birleştir: dönüş sırasında hız eski yönde kaldığı için
    // aradaki fark kendiliğinden kaymaya dönüşür.
    fx = Math.cos(a.aci); fy = Math.sin(a.aci);
    sx = -fy; sy = fx;
    a.vx = fx * ileri + sx * yanal;
    a.vy = fy * ileri + sy * yanal;

    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.x = Math.max(20, Math.min(P.dunya.w - 20, a.x));
    a.y = Math.max(20, Math.min(P.dunya.h - 20, a.y));

    lastikCarpmasi(d, a);
    ilerlemeGuncelle(d, a);
    izBirak(d, a);
  }

  function lastikCarpmasi(d, a) {
    var gerek = Y.yaricap + Y.lastikYaricap;
    for (var i = 0; i < d.lastikler.length; i++) {
      var t = d.lastikler[i];
      var dx = a.x - t.x, dy = a.y - t.y;
      var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
      if (uz >= gerek) continue;
      a.x = t.x + dx / uz * gerek;
      a.y = t.y + dy / uz * gerek;
      a.vx *= Y.lastikYavaslatma;
      a.vy *= Y.lastikYavaslatma;
      a.carpma = 0.3;
      MG.ses.sekme();
    }
  }

  var bosGirdi = { w: false, a: false, s: false, d: false, space: false };

  // Merkez çizgide kaç nokta ilerlediğini sayar; geri gitmek sayılmaz.
  function ilerlemeGuncelle(d, a) {
    if (a.bitti) return;
    var n = P.noktalar.length;
    var i = P.enYakin(a.x, a.y, a.sonNokta).indeks;
    var fark = (i - a.sonNokta + n) % n;
    if (fark > 0 && fark < n / 2) {
      a.ilerleme += fark;
      a.sonNokta = i;
    }
    if (a.ilerleme >= Y.turSayisi * n) {
      a.bitti = true;
      d.bitirenler.push(koltukBul(d, a));
      MG.ses.baslat();
    }
  }

  function koltukBul(d, a) {
    for (var k in d.araclar) {
      if (d.araclar[k] === a) return +k;
    }
    return -1;
  }

  function izBirak(d, a) {
    if (a.kayma < 0.35 && !a.cimde) return;
    d.izler.push({ x: a.x, y: a.y, aci: a.aci, omur: 2.5 });
    if (d.izler.length > 400) d.izler.shift();
  }

  function araclariAyir(d) {
    var ks = Object.keys(d.araclar);
    for (var i = 0; i < ks.length; i++) {
      for (var j = i + 1; j < ks.length; j++) {
        var a = d.araclar[ks[i]], b = d.araclar[ks[j]];
        var dx = b.x - a.x, dy = b.y - a.y;
        var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var gerek = Y.yaricap * 2;
        if (uz >= gerek) continue;
        var it = (gerek - uz) / 2;
        var nx = dx / uz * it, ny = dy / uz * it;
        a.x -= nx; a.y -= ny;
        b.x += nx; b.y += ny;
      }
    }
  }

  // --- sıralama ve sonuç ---------------------------------------------------

  function siralama(d) {
    var ks = Object.keys(d.araclar).map(Number);
    ks.sort(function (p, q) {
      var bp = d.bitirenler.indexOf(p), bq = d.bitirenler.indexOf(q);
      if (bp >= 0 || bq >= 0) { // bitirenler her zaman önde, bitiriş sırasıyla
        if (bp < 0) return 1;
        if (bq < 0) return -1;
        return bp - bq;
      }
      return d.araclar[q].ilerleme - d.araclar[p].ilerleme;
    });
    return ks;
  }

  function bitti(d) {
    if (d.bitirenler.length > 0) return { kazanan: d.bitirenler[0] };
    if (d.kalan > 0) return null;
    var s = siralama(d);
    return { kazanan: s.length ? s[0] : null };
  }

  function ozet(d) {
    var n = P.noktalar.length;
    var o = {};
    var s = siralama(d);
    for (var i = 0; i < s.length; i++) {
      var a = d.araclar[s[i]];
      o[s[i]] = (i + 1) + '. · ' +
        Math.min(Y.turSayisi, Math.floor(a.ilerleme / n) + (a.bitti ? 0 : 1)) +
        '/' + Y.turSayisi + ' tur';
    }
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.araclar[koltuk];
    delete d.botDurum[koltuk];
    var i = d.bitirenler.indexOf(koltuk);
    if (i >= 0) d.bitirenler.splice(i, 1);
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var ar = [];
    for (var k in d.araclar) {
      var a = d.araclar[k];
      ar.push([+k, Math.round(a.x), Math.round(a.y),
               Math.round(a.aci * 100) / 100, a.ilerleme,
               Math.round(a.kayma * 10) / 10, a.cimde ? 1 : 0]);
    }
    return { ar: ar, bi: d.bitirenler, ka: Math.round(d.kalan * 10) / 10 };
  }

  // Misafir: bu oyunun sıçraması en belirgin olanıydı (700 px/sn hızda her
  // pakette ~23 px ışınlanma). Gelen değerler hedef, efekt() yumuşatıyor.
  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;
    d.bitirenler = s.bi || [];
    for (var i = 0; i < s.ar.length; i++) {
      var v = s.ar[i];
      var a = d.araclar[v[0]];
      if (!a) continue;
      a.hx = v[1]; a.hy = v[2]; a.haci = v[3];
      if (a.ilkPaket == null) { a.x = a.hx; a.y = a.hy; a.aci = a.haci; a.ilkPaket = 1; }
      a.ilerleme = v[4]; a.kayma = v[5]; a.cimde = v[6] === 1;
      a.bitti = d.bitirenler.indexOf(v[0]) >= 0;
      izBirak(d, a);
    }
  }

  function uzakYumusat(d, dt) {
    var h = A.yayin.yumusatmaHizi;
    for (var k in d.araclar) {
      var a = d.araclar[k];
      MG.yumusat.nokta(a, dt, h, 200);
      if (a.haci != null) a.aci = MG.yumusat.aci(a.aci, a.haci, dt, h);
    }
  }

  function efekt(d, dt) {
    if (d.uzak) uzakYumusat(d, dt);
    for (var i = d.izler.length - 1; i >= 0; i--) {
      d.izler[i].omur -= dt;
      if (d.izler[i].omur <= 0) d.izler.splice(i, 1);
    }
  }

  return {
    id: 'yaris',
    ad: 'Araba Yarışı',
    kurallar: 'WASD ya da ok tuşları: sür · 2 turu ilk tamamlayan kazanır · Çimde yavaşlarsın',
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.yarisCizim.ciz(d, cv, c, koltuklar, benKoltuk, siralama(d));
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
