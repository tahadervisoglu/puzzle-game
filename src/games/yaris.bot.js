// Yarış botu — merkez çizgide kendinden birkaç nokta ilerideki hedefe sürer.
// İleriye bakma mesafesi hızla büyür: yüksek hızda erken dönmezse virajı kaçırır.
MG.yarisBot = (function () {
  var A = MG.ayar;
  var Y = A.yaris;
  var P = MG.yarisPist;
  var G = MG.geo;

  // Önündeki lastik yığınlarından kaçınmak için hedef açıya eklenen sapma.
  // Bot bunu bilmediğinde bariyere dosdoğru sürüp orada kilitleniyordu.
  function lastikKacinma(d, a) {
    var sapma = 0;
    for (var i = 0; i < d.lastikler.length; i++) {
      var t = d.lastikler[i];
      var dx = t.x - a.x, dy = t.y - a.y;
      var uz = Math.sqrt(dx * dx + dy * dy);
      if (uz > 120 || uz < 1) continue;
      var fark = G.aciNormalle(Math.atan2(dy, dx) - a.aci);
      if (Math.abs(fark) > 0.8) continue;          // önünde değil
      // Hangi tarafa yakınsa öbür tarafa kaç; yakınlaştıkça sapma büyür
      sapma += (fark >= 0 ? -1 : 1) * (1 - uz / 120) * 0.9;
    }
    return Math.max(-0.9, Math.min(0.9, sapma));
  }

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

    var hedefAci = Math.atan2(h.y - a.y, h.x - a.x) + lastikKacinma(d, a);
    var fark = G.aciNormalle(hedefAci - a.aci);
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
