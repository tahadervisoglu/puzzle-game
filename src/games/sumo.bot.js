// Buz Sumo botu. Önceliği hayatta kalmak: kenara savrulduysa şarjı bırakıp
// merkeze doğru toparlanır. Güvendeyse en yakın rakibe nişan alıp yüklenir.
MG.sumoBot = (function () {
  var A = MG.ayar;
  var S = A.sumo;

  function yonBas(g, aci) {
    g.d = Math.cos(aci) > 0.35;
    g.a = Math.cos(aci) < -0.35;
    g.s = Math.sin(aci) > 0.35;
    g.w = Math.sin(aci) < -0.35;
  }

  function enYakinRakip(d, koltuk, o) {
    var enIyi = null, enAz = Infinity;
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var q = d.oyuncular[k];
      if (!q.canli) continue;
      var dx = q.x - o.x, dy = q.y - o.y;
      var u = dx * dx + dy * dy;
      if (u < enAz) { enAz = u; enIyi = q; }
    }
    return enIyi;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    if (!o.canli) { g.w = g.a = g.s = g.d = g.space = false; return; }
    g.w = g.a = g.s = g.d = g.space = false;

    var mx = o.x - d.merkez.x, my = o.y - d.merkez.y;
    var merkezUzak = Math.sqrt(mx * mx + my * my);
    var iceAci = Math.atan2(-my, -mx);

    // Kenara yaklaştıysa şarjı unut, kendini içeri at
    if (merkezUzak > d.yaricap * 0.7) {
      yonBas(g, iceAci);
      return;
    }

    var hedef = enYakinRakip(d, koltuk, o);
    if (!hedef) return;
    var hedefAci = Math.atan2(hedef.y - o.y, hedef.x - o.x);

    b.karar -= dt;
    if (b.karar <= 0) {
      b.karar = 0.5 + d.rng() * 0.6;
      b.hedefSarj = 0.45 + d.rng() * 0.5;
    }

    // Rakip arena kenarına yakınsa onu dışarı itmek için tam güç bekle
    var hx = hedef.x - d.merkez.x, hy = hedef.y - d.merkez.y;
    var hedefKenarda = Math.sqrt(hx * hx + hy * hy) > d.yaricap * 0.62;
    var gerekli = hedefKenarda ? Math.max(b.hedefSarj, 0.8) : b.hedefSarj;

    yonBas(g, hedefAci);              // nişan (şarjdayken hareket etmez)
    g.space = o.sarj < gerekli;       // gücü toplayınca bırakır ve fırlar
  }

  return { guncelle: guncelle };
})();
