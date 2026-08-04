// Yarış botu — merkez çizgide kendinden birkaç nokta ilerideki hedefe sürer.
// İleriye bakma mesafesi hızla büyür: yüksek hızda erken dönmezse virajı kaçırır.
MG.yarisBot = (function () {
  var A = MG.ayar;
  var Y = A.yaris;
  var P = MG.yarisPist;
  var G = MG.geo;

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var a = d.araclar[koltuk];
    var g = d.girdiler[koltuk];
    g.w = g.a = g.s = g.d = false;
    if (a.bitti) return;

    var n = P.noktalar.length;
    var hiz = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
    var ileriBak = 3 + Math.round((hiz / Y.maxHiz) * 7);
    var h = P.noktalar[(a.sonNokta + ileriBak) % n];

    var fark = G.aciNormalle(Math.atan2(h.y - a.y, h.x - a.x) - a.aci);
    if (fark > 0.05) g.d = true;
    else if (fark < -0.05) g.a = true;

    // Keskin virajda gaz kes; beceri katsayısı botları birbirinden ayırır.
    var keskin = Math.abs(fark) > 0.75;
    if (keskin && hiz > Y.maxHiz * 0.45 * b.beceri) g.s = true;
    else g.w = true;

    // Çime çıktıysa merkeze dön ve gaza bas
    if (a.cimde) g.w = true;
  }

  return { guncelle: guncelle };
})();
