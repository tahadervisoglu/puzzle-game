// Örümcek Kaç'ın çizimi. Fitil sayacı örümceğin sırtında durur — herkesin
// aynı sayacı görmesi oyunun bütün gerilimi.
MG.orumcekCizim = (function () {
  var A = MG.ayar;
  var R = A.orumcek;
  var W = A.dunya.w, H = A.dunya.h;

  function ciz(d, cv, c, koltuklar) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    if (d.sarsinti) {
      c.translate((Math.random() - 0.5) * d.sarsinti * 15,
                  (Math.random() - 0.5) * d.sarsinti * 15);
    }

    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);

    c.fillStyle = '#3b3b3b';
    for (var i = 0; i < d.duvarlar.length; i++) {
      var dv = d.duvarlar[i];
      c.fillRect(dv.x, dv.y, dv.w, dv.h);
    }

    hedefCizgisi(c, d);

    for (var k in d.oyuncular) {
      insanCiz(c, d.oyuncular[k], A.renkler[k],
               koltuklar[k] ? koltuklar[k].ad : '');
    }
    orumcekCiz(c, d);

    for (i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2);
      c.fillStyle = p.renk;
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
    c.restore();
  }

  // Örümcek kimin peşinde? Yapışık değilken bunu göstermek şart: fitil
  // biterse ölecek olan o.
  function hedefCizgisi(c, d) {
    if (d.orumcek.durum === 'yapisik') return;
    var h = d.oyuncular[d.orumcek.hedef];
    if (!h || !h.canli) return;
    c.save();
    c.strokeStyle = 'rgba(226,59,59,0.35)';
    c.lineWidth = 3;
    c.setLineDash([9, 9]);
    c.beginPath();
    c.moveTo(d.orumcek.x, d.orumcek.y);
    c.lineTo(h.x, h.y);
    c.stroke();
    c.restore();
  }

  // --- insan ---------------------------------------------------------------

  function insanCiz(c, p, renk, ad) {
    var r = R.insanYaricap;
    c.save();
    c.translate(p.x, p.y);

    if (!p.canli) {
      c.globalAlpha = 0.3;
      c.strokeStyle = '#777';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-9, -9); c.lineTo(9, 9);
      c.moveTo(9, -9); c.lineTo(-9, 9);
      c.stroke();
      c.restore();
      return;
    }

    if (p.dokunulmazlik > 0) { // kısa dokunulmazlık halkası
      c.strokeStyle = 'rgba(60,140,240,0.7)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, r + 6, 0, Math.PI * 2);
      c.stroke();
    }

    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 2;
    c.stroke();

    c.save(); // bakış yönü
    c.rotate(p.aci);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(5, -4, 3.6, 0, Math.PI * 2);
    c.arc(5, 4, 3.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(6.4, -4, 1.8, 0, Math.PI * 2);
    c.arc(6.4, 4, 1.8, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.restore();

    if (ad) {
      c.font = '11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillText(ad, p.x, p.y - r - 8);
    }
  }

  // --- örümcek -------------------------------------------------------------

  function orumcekCiz(c, d) {
    var o = d.orumcek;
    var r = R.orumcekYaricap;
    var kalanOran = Math.max(0, d.fitil / d.fitilBoyu);
    var panik = kalanOran < 0.35;
    // Fitil azaldıkça daha hızlı nabız
    var nabiz = 1 + Math.sin(o.bacak * (panik ? 22 : 9)) * (panik ? 0.16 : 0.07);

    c.save();
    c.translate(o.x, o.y - (o.durum === 'yapisik' ? R.insanYaricap + 3 : 0));
    c.rotate(o.aci);
    c.scale(nabiz, nabiz);

    c.strokeStyle = '#1b1b1b'; // bacaklar
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var taban = -0.9 + i * 0.6;
      var sallanma = Math.sin(o.bacak * 13 + i) * 0.25;
      for (var yon = -1; yon <= 1; yon += 2) {
        var a = (taban + sallanma) * yon;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.9 * yon);
        c.lineTo(Math.cos(a) * r * 2.0, Math.sin(a) * r * 1.3 * yon);
        c.stroke();
      }
    }

    c.fillStyle = panik ? '#8c1c1c' : '#232323'; // gövde
    c.beginPath();
    c.ellipse(-2, 0, r * 1.15, r, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = panik ? '#a82626' : '#333';
    c.beginPath();
    c.arc(r * 0.85, 0, r * 0.6, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#ff4d4d'; // gözler
    c.beginPath();
    c.arc(r * 1.15, -3.5, 2.4, 0, Math.PI * 2);
    c.arc(r * 1.15, 3.5, 2.4, 0, Math.PI * 2);
    c.fill();
    c.restore();

    fitilCiz(c, o, d, kalanOran);
  }

  function fitilCiz(c, o, d, oran) {
    var y = o.y - (o.durum === 'yapisik' ? R.insanYaricap + 3 : 0) - 26;
    c.save();
    c.translate(o.x, y);

    // Fitil bitti: sayaç sıfırda bekler, örümcek artık yakaladığını öldürür
    var av = d.fitil <= 0;
    var yanip = av && Math.floor(o.bacak * 6) % 2 === 0;

    var g = 40, h = 15;
    c.fillStyle = yanip ? '#c0392b' : 'rgba(255,255,255,0.92)';
    c.fillRect(-g / 2, -h / 2, g, h);
    c.strokeStyle = oran < 0.35 ? '#c0392b' : '#444';
    c.lineWidth = 2;
    c.strokeRect(-g / 2, -h / 2, g, h);

    c.fillStyle = yanip ? '#fff' : (oran < 0.35 ? '#c0392b' : '#2b2b2b');
    c.font = 'bold 12px Consolas, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(av ? 'AV!' : d.fitil.toFixed(1), 0, 1);

    // Kalan süreyi çubuk olarak da göster
    c.fillStyle = oran < 0.35 ? '#e74c3c' : '#7cc36b';
    c.fillRect(-g / 2, h / 2 + 2, g * oran, 3);
    c.restore();
    c.textBaseline = 'alphabetic';
  }

  return { ciz: ciz };
})();
