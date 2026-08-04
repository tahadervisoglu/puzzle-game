// Yokuşun geometrisi. Fizik yamaç boyunca ölçülen mesafeyle (s) çalışır;
// çizim ise ekran koordinatı ister. Bu dosya ikisi arasında çeviri yapar:
// yamaç bir kez örneklenir, s -> (x, y, açı) araması ondan gelir.
MG.yokusYamac = (function () {
  var K = MG.ayar.yokus;
  var ADIM = 16;
  var ADET = 1800; // 1800 * 16 = 28800 px — 30 saniyeye fazlasıyla yeter

  // Yamacın s noktasındaki eğimi (dy/dx). İki dalga üst üste: yer yer
  // dikleşir (hızlanırsın), yer yer düzleşir (yavaşlarsın).
  function egim(ofset, s) {
    return K.egimOrt +
           K.egimDalgaUzun * Math.sin((s + ofset) / 700) +
           K.egimDalgaKisa * Math.sin((s + ofset) / 240);
  }

  function uret(ofset) {
    var n = [];
    var x = 0, y = 0, s = 0;
    for (var i = 0; i < ADET; i++) {
      var aci = Math.atan(egim(ofset, s));
      n.push({ x: x, y: y, aci: aci });
      x += Math.cos(aci) * ADIM;
      y += Math.sin(aci) * ADIM;
      s += ADIM;
    }
    return n;
  }

  // s negatif olabilir (başlangıç ızgarası): ilk segmentin açısı uzatılır.
  function konum(noktalar, s) {
    var t = s / ADIM;
    if (t < 0) {
      var p0 = noktalar[0];
      return { x: p0.x + Math.cos(p0.aci) * s,
               y: p0.y + Math.sin(p0.aci) * s, aci: p0.aci };
    }
    var i = Math.floor(t);
    if (i >= noktalar.length - 1) i = noktalar.length - 2;
    var a = noktalar[i], b = noktalar[i + 1];
    var f = t - i;
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      aci: a.aci + (b.aci - a.aci) * f
    };
  }

  // Yamaç yüzeyinden h kadar dik yukarıdaki dünya noktası.
  function yuzeyUstu(noktalar, s, h) {
    var p = konum(noktalar, s);
    return {
      x: p.x + Math.sin(p.aci) * h,
      y: p.y - Math.cos(p.aci) * h,
      aci: p.aci
    };
  }

  return { adim: ADIM, egim: egim, uret: uret, konum: konum, yuzeyUstu: yuzeyUstu };
})();
