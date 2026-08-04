// Kutu Kapmaca — forkliftle ortadaki kutuları kendi alanına taşı.
// Forklift tanktan farklı: yerinde DÖNEMEZ. Direksiyon ancak araç hareket
// ederken iş görür, dönüş miktarı o anki hızla orantılıdır.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.forklift = (function () {
  var A = MG.ayar;
  var G = MG.geo;
  var F = A.forklift;
  var W = A.dunya.w, H = A.dunya.h;

  // --- kurulum -------------------------------------------------------------

  // Alanlar merkez etrafında elips üzerine eşit açıyla dağıtılır: kimse
  // kutu yığınına diğerlerinden yakın başlamaz.
  function alanlariHesapla(oturanlar) {
    var n = oturanlar.length;
    var rx = 290, ry = 165;
    // Başlangıç açısı sadece güzel dursun diye: 2 kişi yan yana,
    // 4 kişi köşelerde.
    var bas = n === 2 ? 0 : (n === 4 ? -Math.PI / 4 : -Math.PI / 2);
    var alanlar = {};
    for (var i = 0; i < n; i++) {
      var a = bas + (i * 2 * Math.PI) / n;
      alanlar[oturanlar[i]] = {
        x: W / 2 + Math.cos(a) * rx,
        y: H / 2 + Math.sin(a) * ry,
        yw: F.alanYw, yh: F.alanYh
      };
    }
    return alanlar;
  }

  function kutulariUret(rng) {
    var kutular = [];
    var deneme = 0;
    // Üst üste binmesinler diye reddetme örneklemesi; sıkışırsa mesafe
    // koşulunu gevşetip yine de 10 kutuyu yerleştir.
    while (kutular.length < F.kutuSayisi && deneme < 600) {
      deneme++;
      var enAz = deneme < 400 ? 36 : 28;
      var x = W / 2 + (rng() * 2 - 1) * 110;
      var y = H / 2 + (rng() * 2 - 1) * 78;
      var uygun = true;
      for (var i = 0; i < kutular.length; i++) {
        var dx = kutular[i].x - x, dy = kutular[i].y - y;
        if (dx * dx + dy * dy < enAz * enAz) { uygun = false; break; }
      }
      if (uygun) {
        kutular.push({ x: x, y: y, aci: (rng() - 0.5) * 1.4, tasiyan: -1, bagilAci: 0 });
      }
    }
    return kutular;
  }

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }

    var d = {
      rng: rng,
      duvarlar: G.cerceve(),
      alanlar: alanlariHesapla(oturanlar),
      kutular: kutulariUret(rng),
      araclar: {},
      girdiler: {},
      botDurum: {},
      parcalar: [],
      kalan: F.turSureSn
    };

    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var al = d.alanlar[s];
      d.araclar[s] = {
        x: al.x, y: al.y,
        aci: Math.atan2(H / 2 - al.y, W / 2 - al.x), // merkeze dönük başla
        hiz: 0, tasidigi: -1, oncekiSpace: false
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0, hedefKutu: -1, kurtul: 0 };
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
    for (var k in d.araclar) {
      if (d.botDurum[k]) MG.forkliftBot.guncelle(d, +k, dt);
      aracGuncelle(d, +k, dt);
    }
    araclariAyir(d);
    tasinanKutulariTasi(d);
  }

  function aracGuncelle(d, koltuk, dt) {
    var f = d.araclar[koltuk];
    var g = d.girdiler[koltuk];

    var hedefHiz = g.w ? F.hiz : (g.s ? -F.geriHiz : 0);
    var fark = hedefHiz - f.hiz;
    var degisim = F.ivme * dt;
    f.hiz += Math.abs(fark) < degisim ? fark : (fark > 0 ? degisim : -degisim);

    // Yerinde dönüş yok: direksiyon etkisi hıza orantılı. Geri giderken
    // araç ters yöne kıvrılır — gerçek bir forklift gibi.
    var direksiyon = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    if (direksiyon) {
      f.aci = G.aciNormalle(f.aci + direksiyon * F.donusHiz * (f.hiz / F.hiz) * dt);
    }

    if (f.hiz) {
      var oncekiX = f.x, oncekiY = f.y;
      G.kaydir(f, Math.cos(f.aci) * f.hiz * dt, Math.sin(f.aci) * f.hiz * dt,
               F.yaricap, d.duvarlar);
      if (f.x === oncekiX && f.y === oncekiY) f.hiz = 0; // duvara dayandı
    }

    if (g.space && !f.oncekiSpace) alVeyaBirak(d, koltuk, f);
    f.oncekiSpace = g.space;
  }

  function catalUcu(f) {
    return { x: f.x + Math.cos(f.aci) * F.catalUzak,
             y: f.y + Math.sin(f.aci) * F.catalUzak };
  }

  function alVeyaBirak(d, koltuk, f) {
    if (f.tasidigi >= 0) {
      d.kutular[f.tasidigi].tasiyan = -1;
      f.tasidigi = -1;
      MG.ses.birak();
      return;
    }
    var c = catalUcu(f);
    var enIyi = -1, enYakin = F.almaMesafe * F.almaMesafe;
    for (var i = 0; i < d.kutular.length; i++) {
      var kt = d.kutular[i];
      if (kt.tasiyan >= 0) continue; // başkasının çatalındaki kutu alınamaz
      var dx = kt.x - c.x, dy = kt.y - c.y;
      var u = dx * dx + dy * dy;
      if (u < enYakin) { enYakin = u; enIyi = i; }
    }
    if (enIyi < 0) return;
    var kutu = d.kutular[enIyi];
    kutu.tasiyan = koltuk;
    // Kutunun yamukluğu korunur — çatala nasıl girdiyse öyle taşınır.
    kutu.bagilAci = G.aciNormalle(kutu.aci - f.aci);
    f.tasidigi = enIyi;
    MG.ses.kaldir();
  }

  function tasinanKutulariTasi(d) {
    for (var k in d.araclar) {
      var f = d.araclar[k];
      if (f.tasidigi < 0) continue;
      var c = catalUcu(f);
      var kutu = d.kutular[f.tasidigi];
      kutu.x = c.x; kutu.y = c.y;
      kutu.aci = f.aci + kutu.bagilAci;
    }
  }

  // Forkliftler birbirinin içinden geçmesin — itişme oyunun tuzu biberi.
  function araclariAyir(d) {
    var ks = Object.keys(d.araclar);
    for (var i = 0; i < ks.length; i++) {
      for (var j = i + 1; j < ks.length; j++) {
        var a = d.araclar[ks[i]], b = d.araclar[ks[j]];
        var dx = b.x - a.x, dy = b.y - a.y;
        var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var gerek = F.yaricap * 2;
        if (uz >= gerek) continue;
        var it = (gerek - uz) / 2;
        var nx = dx / uz * it, ny = dy / uz * it;
        G.kaydir(a, -nx, -ny, F.yaricap, d.duvarlar);
        G.kaydir(b, nx, ny, F.yaricap, d.duvarlar);
      }
    }
  }

  // --- skor ----------------------------------------------------------------

  // Bir kutu, taşınmıyorsa ve merkezi bir alanın içindeyse o alana sayılır.
  function kutuSayilari(d) {
    var s = {};
    for (var k in d.alanlar) s[k] = 0;
    for (var i = 0; i < d.kutular.length; i++) {
      var kt = d.kutular[i];
      if (kt.tasiyan >= 0) continue;
      for (var a in d.alanlar) {
        var al = d.alanlar[a];
        if (Math.abs(kt.x - al.x) <= al.yw && Math.abs(kt.y - al.y) <= al.yh) {
          s[a]++;
          break;
        }
      }
    }
    return s;
  }

  function bitti(d) {
    if (d.kalan > 0) return null;
    var s = kutuSayilari(d);
    var enCok = -1, kazanan = null, berabere = false;
    for (var k in s) {
      if (s[k] > enCok) { enCok = s[k]; kazanan = +k; berabere = false; }
      else if (s[k] === enCok) berabere = true;
    }
    if (berabere || enCok <= 0) return { kazanan: null };
    return { kazanan: kazanan };
  }

  function ozet(d) {
    var s = kutuSayilari(d);
    var o = {};
    for (var k in s) o[k] = s[k] + ' kutu';
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    var f = d.araclar[koltuk];
    if (f && f.tasidigi >= 0) d.kutular[f.tasidigi].tasiyan = -1; // kutuyu serbest bırak
    delete d.araclar[koltuk];
    delete d.alanlar[koltuk];
    delete d.botDurum[koltuk];
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var ar = [];
    for (var k in d.araclar) {
      var f = d.araclar[k];
      ar.push([+k, Math.round(f.x), Math.round(f.y),
               Math.round(f.aci * 100) / 100, f.tasidigi]);
    }
    return {
      ar: ar,
      ku: d.kutular.map(function (kt) {
        return [Math.round(kt.x), Math.round(kt.y),
                Math.round(kt.aci * 100) / 100, kt.tasiyan];
      }),
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.ar.length; i++) {
      var v = s.ar[i];
      var f = d.araclar[v[0]];
      if (!f) continue;
      f.x = v[1]; f.y = v[2]; f.aci = v[3];
      if (f.tasidigi !== v[4]) {
        // Kaldırma/bırakma anını farktan yakala, sesi burada çal.
        if (v[4] >= 0) MG.ses.kaldir(); else MG.ses.birak();
        f.tasidigi = v[4];
      }
    }
    for (i = 0; i < s.ku.length && i < d.kutular.length; i++) {
      var kt = d.kutular[i], w = s.ku[i];
      kt.x = w[0]; kt.y = w[1]; kt.aci = w[2]; kt.tasiyan = w[3];
    }
  }

  function efekt(d, dt) {
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.9; p.vy *= 0.9;
    }
  }

  return {
    id: 'forklift',
    ad: 'Kutu Kapmaca',
    kurallar: 'WASD: sür · Boşluk: kaldır/bırak · 30 sn’de en çok kutu kazanır',
    kur: kur,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar) {
      MG.forkliftCizim.ciz(d, cv, c, koltuklar, kutuSayilari(d));
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
