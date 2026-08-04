// Kutu Kapmaca botu — sadece oda sahibinde çalışır.
// Forklift yerinde dönemediği için bot da araç gibi düşünmek zorunda:
// hedef arkasında kaldıysa geri manevra yapar.
MG.forkliftBot = (function () {
  var A = MG.ayar;
  var G = MG.geo;
  var F = A.forklift;

  function alanIcinde(x, y, al) {
    return Math.abs(x - al.x) <= al.yw && Math.abs(y - al.y) <= al.yh;
  }

  function catalUcu(f) {
    return { x: f.x + Math.cos(f.aci) * F.catalUzak,
             y: f.y + Math.sin(f.aci) * F.catalUzak };
  }

  // Kendi alanındaki kutuyu tekrar almaya çalışma; başkasınınkine serbest.
  function hedefKutuBul(d, koltuk, f) {
    var kendi = d.alanlar[koltuk];
    var enIyi = null, enYakin = Infinity;
    for (var i = 0; i < d.kutular.length; i++) {
      var kt = d.kutular[i];
      if (kt.tasiyan >= 0) continue;
      if (kendi && alanIcinde(kt.x, kt.y, kendi)) continue;
      var dx = kt.x - f.x, dy = kt.y - f.y;
      var u = dx * dx + dy * dy;
      if (u < enYakin) { enYakin = u; enIyi = kt; }
    }
    return enIyi;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var f = d.araclar[koltuk];
    var g = d.girdiler[koltuk];
    g.w = g.a = g.s = g.d = g.space = false;

    b.karar -= dt;
    if (b.karar <= 0) {
      b.karar = A.bot.kararSn;
      // Takılma tespiti: bir karar aralığında yerinden oynamadıysa
      // duvara ya da başka bir forklifte dayanmış demektir.
      var gx = f.x - (b.sonX || 0), gy = f.y - (b.sonY || 0);
      if (b.kurtul <= 0 && gx * gx + gy * gy < A.bot.takilmaPx * A.bot.takilmaPx) {
        b.kurtul = A.bot.kurtulmaSn;
        b.don = d.rng() < 0.5 ? 1 : -1;
      }
      b.sonX = f.x; b.sonY = f.y;
    }

    if (b.kurtul > 0) { // geri gidip burnu başka yöne çevir
      b.kurtul -= dt;
      g.s = true;
      if (b.don > 0) g.d = true; else g.a = true;
      return;
    }

    var kendi = d.alanlar[koltuk];
    var hx, hy;

    if (f.tasidigi >= 0) {
      if (!kendi) return;
      hx = kendi.x; hy = kendi.y;
      var c = catalUcu(f);
      if (alanIcinde(c.x, c.y, kendi)) { g.space = true; return; }
    } else {
      var kutu = hedefKutuBul(d, koltuk, f);
      if (!kutu) return;
      hx = kutu.x; hy = kutu.y;
      var uc = catalUcu(f);
      var dx = kutu.x - uc.x, dy = kutu.y - uc.y;
      if (dx * dx + dy * dy < (F.almaMesafe * 0.8) * (F.almaMesafe * 0.8)) {
        g.space = true;
        return;
      }
    }

    sur(g, f, hx, hy);
  }

  function sur(g, f, hx, hy) {
    var fark = G.aciNormalle(Math.atan2(hy - f.y, hx - f.x) - f.aci);
    if (Math.abs(fark) > 2.0) {
      // Hedef neredeyse tam arkada: ileri dönmek uzun sürer, geri manevra
      // yap. Geri giderken direksiyon ters çalıştığı için yön de terstir.
      g.s = true;
      if (fark > 0) g.a = true; else g.d = true;
      return;
    }
    g.w = true;
    if (fark > 0.08) g.d = true;
    else if (fark < -0.08) g.a = true;
  }

  return { guncelle: guncelle };
})();
