// Örümcek Kaç botu. İki hali var:
//   sırtındaysa  -> en yakın rakibe nişan alıp fırlatır (sorunu devreder)
//   sırtında yoksa -> örümcekten uzaklaşan yöne kaçar, duvara sıkışırsa
//                     kenar boyunca sıyrılır.
MG.orumcekBot = (function () {
  var A = MG.ayar;
  var R = A.orumcek;
  var G = MG.geo;

  function yonBas(g, aci) {
    g.d = Math.cos(aci) > 0.35;
    g.a = Math.cos(aci) < -0.35;
    g.s = Math.sin(aci) > 0.35;
    g.w = Math.sin(aci) < -0.35;
  }

  function enYakinRakip(d, koltuk, p) {
    var enIyi = null, enAz = Infinity;
    for (var k in d.oyuncular) {
      if (+k === koltuk) continue;
      var q = d.oyuncular[k];
      if (!q.canli) continue;
      var dx = q.x - p.x, dy = q.y - p.y;
      var u = dx * dx + dy * dy;
      if (u < enAz) { enAz = u; enIyi = q; }
    }
    return enIyi;
  }

  // Kaçış yönü: örümceğin tersi. Duvar varsa etrafına doğru sap.
  function kacisAcisi(d, p) {
    var o = d.orumcek;
    var kac = Math.atan2(p.y - o.y, p.x - o.x);
    var enIyi = kac, enIyiPuan = -Infinity;
    // Ters yönün çevresinde birkaç aday dene, en açık olanı seç
    for (var i = -3; i <= 3; i++) {
      var a = kac + i * 0.42;
      var puan = acikMesafe(d, p, a) + Math.cos(a - kac) * 40;
      if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = a; }
    }
    return enIyi;
  }

  // O yönde duvara kadar ne kadar yer var?
  function acikMesafe(d, p, aci) {
    var adim = 22;
    for (var i = 1; i <= 6; i++) {
      var x = p.x + Math.cos(aci) * adim * i;
      var y = p.y + Math.sin(aci) * adim * i;
      if (G.daireDuvarCarpar(x, y, R.insanYaricap, d.duvarlar)) return adim * (i - 1);
    }
    return adim * 6;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var p = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.w = g.a = g.s = g.d = g.space = false;

    var o = d.orumcek;

    if (o.durum === 'yapisik' && o.sahip === koltuk) {
      // Sırtında: en yakın rakibe dön, hizalanınca fırlat
      var hedef = enYakinRakip(d, koltuk, p);
      if (!hedef) return;
      var istenen = Math.atan2(hedef.y - p.y, hedef.x - p.x);
      yonBas(g, istenen);
      if (Math.abs(G.aciNormalle(istenen - p.aci)) < 0.4) g.space = true;
      return;
    }

    b.karar -= dt;
    if (b.karar <= 0) {
      b.karar = 0.16;
      b.kacisAci = kacisAcisi(d, p);
    }
    yonBas(g, b.kacisAci);
  }

  return { guncelle: guncelle };
})();
