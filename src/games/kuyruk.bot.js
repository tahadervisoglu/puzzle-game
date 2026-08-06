// Kuyruk Yakala botu.
// Aynı anda hem avcı hem av: kendi ucuna yaklaşan varsa kaçar, yoksa en
// zayıf rakibin kuyruk ucuna saldırır.
MG.kuyrukBot = (function () {
  var A = MG.ayar;
  var Q = A.kuyruk;

  function yonBas(g, aci) {
    g.d = Math.cos(aci) > 0.35;
    g.a = Math.cos(aci) < -0.35;
    g.s = Math.sin(aci) > 0.35;
    g.w = Math.sin(aci) < -0.35;
  }

  // Benim ucuma en yakın rakip ne kadar uzakta?
  function tehdit(d, koltuk, o, O) {
    var benimUc = O.uc(o);
    if (!benimUc) return null;
    var enIyi = null, enAz = Infinity;
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var b = d.oyuncular[k];
      if (!b.canli) continue;
      var u = Math.hypot(b.x - benimUc.x, b.y - benimUc.y);
      if (u < enAz) { enAz = u; enIyi = b; }
    }
    return enIyi ? { rakip: enIyi, uzak: enAz } : null;
  }

  // Hedef: ucu en yakın olan rakip; kuyruğu az olanı bitirmek daha kolay
  function avSec(d, koltuk, o, O) {
    var enIyi = null, enIyiPuan = Infinity;
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var b = d.oyuncular[k];
      if (!b.canli || b.dokunulmazlik > 0) continue;
      var u = O.uc(b);
      if (!u) continue;
      var puan = Math.hypot(u.x - o.x, u.y - o.y) + b.kuyruk * 25;
      if (puan < enIyiPuan) { enIyiPuan = puan; enIyi = { hedef: u, uzak: puan }; }
    }
    return enIyi;
  }

  function guncelle(d, koltuk, dt) {
    var bd = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    var O = MG.oyunlar.kuyruk;
    g.w = g.a = g.s = g.d = g.space = false;

    bd.karar -= dt;
    if (bd.karar > 0 && bd.aci != null) {
      yonBas(g, bd.aci);
      if (bd.atil && o.bekleme <= 0) g.space = true;
      return;
    }
    bd.karar = Q.botKararSn;
    bd.atil = false;

    var t = tehdit(d, koltuk, o, O);
    // Ucum tehdit altındaysa kaçmak saldırmaktan önce gelir
    if (t && t.uzak < 95) {
      bd.aci = Math.atan2(o.y - t.rakip.y, o.x - t.rakip.x);
      bd.atil = t.uzak < 55;
      yonBas(g, bd.aci);
      if (bd.atil && o.bekleme <= 0) g.space = true;
      return;
    }

    var av = avSec(d, koltuk, o, O);
    if (!av) { bd.aci = null; return; }
    bd.aci = Math.atan2(av.hedef.y - o.y, av.hedef.x - o.x);
    var mesafe = Math.hypot(av.hedef.x - o.x, av.hedef.y - o.y);
    bd.atil = mesafe > 60 && mesafe < 170;   // son hamleyi atılmayla yap
    yonBas(g, bd.aci);
    if (bd.atil && o.bekleme <= 0) g.space = true;
  }

  return { guncelle: guncelle };
})();
