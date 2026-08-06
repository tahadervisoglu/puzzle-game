// Renk Kapma'nın çizimi. Üstteki şerit kimin ne kadar alanı olduğunu canlı
// gösteriyor — kimse elenmediği için gerilim tamamen bu çubukta.
MG.boyaCizim = (function () {
  var A = MG.ayar;
  var Y = A.boya;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;
  var SERIT = 16;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.boya;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    c.fillStyle = '#eceff3';
    c.fillRect(0, 0, W, H);

    zeminCiz(c, d, O);
    izgaraCiz(c);

    for (var k in d.oyuncular) {
      oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    var ben = d.oyuncular[benKoltuk];
    if (ben) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - Y.oyuncuYaricap - 15,
                                A.renkler[benKoltuk]);
    }

    seritCiz(c, d, O, koltuklar);
    c.restore();
  }

  // Aynı renkteki yatay dizileri tek dikdörtgen olarak çiziyoruz; 1000
  // hücreyi tek tek boyamak boşuna maliyet.
  function zeminCiz(c, d, O) {
    var h = Y.hucre;
    for (var cy = 0; cy < O.satir; cy++) {
      var cx = 0;
      while (cx < O.sutun) {
        var v = d.zemin[O.indeks(cx, cy)];
        if (!v) { cx++; continue; }
        var bas = cx;
        while (cx < O.sutun && d.zemin[O.indeks(cx, cy)] === v) cx++;
        c.fillStyle = A.renkler[v - 1] || '#999';
        c.fillRect(bas * h, cy * h, (cx - bas) * h, h);
      }
    }
  }

  function izgaraCiz(c) {
    c.strokeStyle = 'rgba(0,0,0,0.06)';
    c.lineWidth = 1;
    for (var x = Y.hucre; x < W; x += Y.hucre) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    for (var y = Y.hucre; y < H; y += Y.hucre) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
  }

  function oyuncuCiz(c, o, renk, ad) {
    var r = Y.oyuncuYaricap;
    c.save();
    c.translate(o.x, o.y);

    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.beginPath();
    c.ellipse(0, r * 0.85, r * 0.9, r * 0.35, 0, 0, TAU);
    c.fill();

    c.fillStyle = '#ffffff';           // beyaz halka: kendi boyasında kaybolmasın
    c.beginPath();
    c.arc(0, 0, r + 3, 0, TAU);
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
      c.fillStyle = 'rgba(0,0,0,0.65)';
      c.fillText(ad, o.x, o.y - r - 9);
    }
  }

  // Ekranın üstünde alan payı şeridi
  function seritCiz(c, d, O, koltuklar) {
    var toplam = d.zemin.length;
    var x = 0;
    c.save();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(0, 0, W, SERIT);

    var sirali = O.siralama(d);
    for (var i = 0; i < sirali.length; i++) {
      var k = sirali[i];
      var g = (d.skor[k] || 0) / toplam * W;
      if (g < 0.5) continue;
      c.fillStyle = A.renkler[k];
      c.fillRect(x, 0, g, SERIT);

      if (g > 42) {                    // sığıyorsa yüzdeyi de yaz
        c.fillStyle = 'rgba(255,255,255,0.95)';
        c.font = 'bold 11px system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('%' + O.yuzde(d, k), x + g / 2, SERIT / 2 + 1);
      }
      x += g;
    }
    c.textBaseline = 'alphabetic';
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, W - 1, SERIT - 1);
    c.restore();
  }

  return { ciz: ciz };
})();
