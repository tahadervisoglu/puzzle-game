// Işık Duvarı'nın çizimi — siber ızgara üstünde parlayan duvarlar.
MG.isikCizim = (function () {
  var A = MG.ayar;
  var L = A.isik;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.isik;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    if (d.sarsinti) {
      c.translate((Math.random() - 0.5) * d.sarsinti * 12,
                  (Math.random() - 0.5) * d.sarsinti * 12);
    }

    zeminCiz(c);
    izleriCiz(c, d, O);

    for (var k in d.oyuncular) {
      oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - 20, A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  function zeminCiz(c) {
    var gr = c.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7);
    gr.addColorStop(0, '#121a2c');
    gr.addColorStop(1, '#080b14');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    c.strokeStyle = 'rgba(90, 150, 220, 0.10)';
    c.lineWidth = 1;
    for (var x = 0; x < W; x += 40) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    for (var y = 0; y < H; y += 40) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }

    c.strokeStyle = 'rgba(120, 200, 255, 0.45)';   // arena kenarı
    c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, W - 3, H - 3);
  }

  // Izgarayı hücre hücre dolaşıp aynı renkteki yatay dizileri tek dikdörtgen
  // olarak çiziyoruz — 4000 hücreyi tek tek boyamak boşuna maliyet.
  function izleriCiz(c, d, O) {
    var h = L.hucre;
    for (var cy = 0; cy < O.satir; cy++) {
      var cx = 0;
      while (cx < O.sutun) {
        var v = d.izler[O.indeks(cx, cy)];
        if (!v) { cx++; continue; }
        var bas = cx;
        while (cx < O.sutun && d.izler[O.indeks(cx, cy)] === v) cx++;
        var renk = A.renkler[v - 1] || '#888';
        c.fillStyle = renk;
        c.globalAlpha = 0.85;
        c.fillRect(bas * h, cy * h, (cx - bas) * h, h);
        c.globalAlpha = 0.25;                     // üstte ince parlama
        c.fillStyle = '#ffffff';
        c.fillRect(bas * h, cy * h, (cx - bas) * h, 2);
        c.globalAlpha = 1;
      }
    }
  }

  function oyuncuCiz(c, o, renk, ad) {
    if (!o.canli) return;
    c.save();
    c.translate(o.x, o.y);

    c.globalAlpha = 0.35;                          // hale
    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, 14, 0, TAU);
    c.fill();
    c.globalAlpha = 1;

    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(0, 0, 6, 0, TAU);
    c.fill();
    c.strokeStyle = renk;
    c.lineWidth = 3;
    c.stroke();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fillText(ad, o.x, o.y - 26);
    }
  }

  function parcalariCiz(c, d) {
    for (var i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2.5);
      c.fillStyle = '#9fe8ff';
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    c.globalAlpha = 1;
  }

  return { ciz: ciz };
})();
