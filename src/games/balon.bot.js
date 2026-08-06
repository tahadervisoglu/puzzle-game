// Balon Düellosu botu.
// Kural basit: kendinden aşağıdaki rakibin üstüne git ve düş; yukarıdakinden
// yanlara kaç. Platform kenarına gelince zıplayarak kat değiştirir.
MG.balonBot = (function () {
  var A = MG.ayar;
  var B = A.balon;
  var W = A.dunya.w;

  function enYakinRakip(d, koltuk, o) {
    var enIyi = null, enAz = Infinity;
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var b = d.oyuncular[k];
      if (!b.canli) continue;
      var u = Math.hypot(b.x - o.x, b.y - o.y);
      if (u < enAz) { enAz = u; enIyi = b; }
    }
    return enIyi;
  }

  // Bulunduğu platformun kenarına yaklaştı mı? (boşluğa yürümesin)
  function kenardaMi(d, o, yon) {
    if (!o.yerde) return false;
    var x = o.x + yon * (B.oyuncuYaricap + 10);
    var alt = o.y + B.oyuncuYaricap + 4;
    for (var i = 0; i < d.platformlar.length; i++) {
      var p = d.platformlar[i];
      if (Math.abs(p.y - alt) > 10) continue;
      if (x >= p.x && x <= p.x + p.w) return false;
    }
    return true;
  }

  function guncelle(d, koltuk, dt) {
    var bd = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.a = g.d = g.space = false;

    var r = enYakinRakip(d, koltuk, o);
    if (!r) return;

    bd.karar -= dt;
    if (bd.karar <= 0) {
      bd.karar = B.botKararSn;
      // Aynı hizadakine de saldırılır: yaklaşıp zıplayarak tepesine inilir.
      // "Sadece aşağıdakine saldır" kuralıyla botlar aynı platformda
      // birbirlerine hiç dokunmuyordu.
      bd.saldir = r.y > o.y - 25;
    }

    var yatay = Math.abs(r.x - o.x);
    var yon;
    if (bd.saldir) {
      yon = r.x > o.x ? 1 : -1;
      // Tam tepesindeyken yana kaçma, üstüne düş
      if (yatay < B.oyuncuYaricap && r.y > o.y) yon = 0;
    } else {
      yon = r.x > o.x ? -1 : 1;      // yukarıdakinden uzaklaş
      if (o.x < 60) yon = 1;
      if (o.x > W - 60) yon = -1;
    }
    if (yon > 0) g.d = true; else if (yon < 0) g.a = true;

    if (yon !== 0 && kenardaMi(d, o, yon)) g.space = true;   // boşluğa yürüme

    // Saldırı zıplaması: yeterince yaklaştıysan havalan ki tepesine inebilesin
    if (bd.saldir && o.yerde && yatay < 95 && yatay > 12) g.space = true;
    if (!bd.saldir && r.y < o.y - 30 && o.yerde && d.rng() < 0.02) g.space = true;
  }

  return { guncelle: guncelle };
})();
