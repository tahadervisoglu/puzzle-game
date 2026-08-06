// Kral Tepesi botu.
// Tepede değilse tepeye koşar. Tepedeyse merkezde tutunmaya çalışır ve
// menzile giren rakibe omuz atar — tek başına kalmak iki kat puan demek.
MG.kralBot = (function () {
  var A = MG.ayar;
  var K = A.kral;

  function yonBas(g, aci) {
    g.d = Math.cos(aci) > 0.35;
    g.a = Math.cos(aci) < -0.35;
    g.s = Math.sin(aci) > 0.35;
    g.w = Math.sin(aci) < -0.35;
  }

  function menzildekiRakip(d, koltuk, o) {
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var b = d.oyuncular[k];
      if (Math.hypot(b.x - o.x, b.y - o.y) <= K.omuzMenzil * 0.85) return b;
    }
    return null;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.w = g.a = g.s = g.d = g.space = false;

    var tepeAci = Math.atan2(d.tepe.y - o.y, d.tepe.x - o.x);
    var uzak = Math.hypot(d.tepe.x - o.x, d.tepe.y - o.y);

    // Menzilde rakip varsa savur — beklemesi dolmuşsa bedava kazanç
    var rakip = menzildekiRakip(d, koltuk, o);
    if (rakip && o.bekleme <= 0) g.space = true;

    if (uzak > K.tepeYaricap * 0.55) {
      yonBas(g, tepeAci);               // tepeye koş / merkeze tutun
      return;
    }

    b.karar -= dt;
    if (b.karar <= 0) {
      b.karar = 0.4 + d.rng() * 0.4;
      // Tepedeyken en yakın rakibi merkezden dışarı itmeye çalış
      var enYakin = null, enAz = Infinity;
      for (var k in d.oyuncular) {
        if (+k === koltuk) continue;
        var r2 = d.oyuncular[k];
        var u = Math.hypot(r2.x - o.x, r2.y - o.y);
        if (u < enAz) { enAz = u; enYakin = r2; }
      }
      b.hedefAci = (enYakin && enAz < K.tepeYaricap * 1.6)
        ? Math.atan2(enYakin.y - o.y, enYakin.x - o.x)
        : tepeAci;
    }
    if (b.hedefAci != null) yonBas(g, b.hedefAci);
  }

  return { guncelle: guncelle };
})();
