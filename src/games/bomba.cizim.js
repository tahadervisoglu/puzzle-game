// Bomba Kaos'un çizimi.
MG.bombaCizim = (function () {
  var A = MG.ayar;
  var B = A.bomba;
  var I = MG.bombaIzgara;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  var BONUS_RENK = { bomba: '#e2554f', menzil: '#f2a33c', hiz: '#3aa6d8' };

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    if (d.sarsinti) {
      c.translate((Math.random() - 0.5) * d.sarsinti * 14,
                  (Math.random() - 0.5) * d.sarsinti * 14);
    }

    c.fillStyle = '#2c3038';
    c.fillRect(0, 0, W, H);

    zeminCiz(c, d);
    bonuslariCiz(c, d);
    bombalariCiz(c, d);
    duvarlariCiz(c, d);
    alevleriCiz(c, d);

    for (var k in d.oyuncular) {
      oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - B.oyuncuYaricap - 16,
                                A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  // --- zemin ve duvarlar ---------------------------------------------------

  function zeminCiz(c, d) {
    for (var cy = 0; cy < B.satir; cy++) {
      for (var cx = 0; cx < B.sutun; cx++) {
        var x = I.ofs.x + cx * B.hucre, y = I.ofs.y + cy * B.hucre;
        c.fillStyle = (cx + cy) % 2 ? '#8fae72' : '#84a468';
        c.fillRect(x, y, B.hucre, B.hucre);
      }
    }
  }

  function duvarlariCiz(c, d) {
    for (var cy = 0; cy < B.satir; cy++) {
      for (var cx = 0; cx < B.sutun; cx++) {
        var t = d.hucreler[I.indeks(cx, cy)];
        if (t === I.BOS) continue;
        var x = I.ofs.x + cx * B.hucre, y = I.ofs.y + cy * B.hucre;
        if (t === I.SERT) sertCiz(c, x, y);
        else kutuCiz(c, x, y);
      }
    }
  }

  function sertCiz(c, x, y) {
    var h = B.hucre;
    c.fillStyle = '#4c5560';
    c.fillRect(x, y, h, h);
    c.fillStyle = '#5d6875';
    c.fillRect(x + 3, y + 3, h - 6, h - 8);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(x + 3, y + 3, h - 6, 5);
  }

  function kutuCiz(c, x, y) {
    var h = B.hucre;
    c.fillStyle = '#a9713c';
    c.fillRect(x + 2, y + 2, h - 4, h - 4);
    c.fillStyle = '#c08a52';
    c.fillRect(x + 5, y + 5, h - 10, h - 10);
    c.strokeStyle = 'rgba(90,55,20,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 5, y + h / 2); c.lineTo(x + h - 5, y + h / 2);
    c.stroke();
  }

  // --- bombalar, alev, bonus ----------------------------------------------

  function bombalariCiz(c, d) {
    for (var i = 0; i < d.bombalar.length; i++) {
      var b = d.bombalar[i];
      var x = I.merkezX(b.cx), y = I.merkezY(b.cy);
      // Fitil azaldıkça hızlanan nabız: ne zaman patlayacağı gözle görülsün
      var kalan = Math.max(0, b.fitil);
      var nabiz = 1 + Math.sin((B.fitilSn - kalan) * (kalan < 1 ? 26 : 10)) * 0.12;
      var r = (B.hucre * 0.36) * nabiz;

      c.fillStyle = kalan < 1 ? '#8c1c1c' : '#1f2126';
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath();
      c.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, TAU);
      c.fill();

      c.strokeStyle = '#c98b3a'; // fitil
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + r * 0.4, y - r * 0.7);
      c.quadraticCurveTo(x + r * 1.1, y - r * 1.4, x + r * 0.7, y - r * 1.8);
      c.stroke();
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.arc(x + r * 0.7, y - r * 1.9, 3.5, 0, TAU);
      c.fill();
    }
  }

  function alevleriCiz(c, d) {
    for (var i = 0; i < d.alevler.length; i++) {
      var a = d.alevler[i];
      var oran = Math.max(0, Math.min(1, a.omur / B.alevOmurSn));
      var x = I.ofs.x + a.cx * B.hucre, y = I.ofs.y + a.cy * B.hucre;
      var ic = B.hucre * (0.12 + (1 - oran) * 0.1);

      c.save();
      c.globalAlpha = 0.35 + oran * 0.55;
      c.fillStyle = '#ff7a1a';
      c.fillRect(x + 1, y + 1, B.hucre - 2, B.hucre - 2);
      c.fillStyle = '#ffd166';
      c.fillRect(x + ic, y + ic, B.hucre - ic * 2, B.hucre - ic * 2);
      c.restore();
    }
  }

  function bonuslariCiz(c, d) {
    for (var i = 0; i < d.bonuslar.length; i++) {
      var b = d.bonuslar[i];
      var x = I.merkezX(b.cx), y = I.merkezY(b.cy);
      var r = B.hucre * 0.3;
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath();
      c.arc(x, y, r + 3, 0, TAU);
      c.fill();
      c.fillStyle = BONUS_RENK[b.tip] || '#888';
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();

      c.fillStyle = '#fff';
      c.font = 'bold 15px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(b.tip === 'bomba' ? '+' : (b.tip === 'menzil' ? '✳' : '»'), x, y + 1);
      c.textBaseline = 'alphabetic';
    }
  }

  // --- oyuncu --------------------------------------------------------------

  function oyuncuCiz(c, o, renk, ad) {
    var r = B.oyuncuYaricap;
    c.save();
    c.translate(o.x, o.y);
    if (!o.canli) { c.restore(); return; }

    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.ellipse(0, r * 0.85, r * 0.9, r * 0.4, 0, 0, TAU);
    c.fill();

    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.stroke();

    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(-4.5, -3, 4, 0, TAU);
    c.arc(4.5, -3, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(-4.5, -2, 2, 0, TAU);
    c.arc(4.5, -2, 2, 0, TAU);
    c.fill();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fillText(ad, o.x, o.y - r - 7);
    }
  }

  function parcalariCiz(c, d) {
    for (var i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2.5);
      c.fillStyle = p.renk || '#a9713c';
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
  }

  return { ciz: ciz };
})();
