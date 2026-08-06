// Balon Düellosu'nun çizimi — yandan görünüm, platformlar ve baştaki balonlar.
MG.balonCizim = (function () {
  var A = MG.ayar;
  var B = A.balon;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.balon;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    if (d.sarsinti) {
      c.translate((Math.random() - 0.5) * d.sarsinti * 16,
                  (Math.random() - 0.5) * d.sarsinti * 16);
    }

    gokyuzu(c);
    platformlariCiz(c, d);

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (o.canli) oyuncuCiz(c, o, A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '', O);
    }
    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, O.balonUstu(ben) - 18, A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  function gokyuzu(c) {
    var gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#7ec8e8');
    gr.addColorStop(0.7, '#bfe3f2');
    gr.addColorStop(1, '#e8f4d9');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    c.fillStyle = 'rgba(255,255,255,0.55)';    // bulutlar
    bulut(c, 130, 70, 34);
    bulut(c, 610, 100, 28);
    bulut(c, 400, 55, 22);
  }

  function bulut(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.arc(x + r * 0.9, y + 5, r * 0.75, 0, TAU);
    c.arc(x - r * 0.9, y + 6, r * 0.65, 0, TAU);
    c.fill();
  }

  function platformlariCiz(c, d) {
    var kal = B.platformKalinlik;
    for (var i = 0; i < d.platformlar.length; i++) {
      var p = d.platformlar[i];
      c.fillStyle = '#6b4a2f';                 // toprak gövde
      c.fillRect(p.x, p.y, p.w, Math.max(kal, i === 0 ? H - p.y : kal + 10));
      c.fillStyle = '#5aa646';                 // çim üst yüz
      c.fillRect(p.x, p.y, p.w, 7);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(p.x, p.y, p.w, 2);
    }
  }

  function oyuncuCiz(c, o, renk, ad, O) {
    var r = B.oyuncuYaricap;

    // Balonlar tam çarpışma noktasında çizilir. Önceden hafifçe salınıyorlardı
    // ama çarpışma sabit noktadan hesaplanıyordu: gördüğün yere basıp
    // ıskalıyordun, oyunun en sinir bozucu yanı buydu.
    for (var i = 0; i < o.balon; i++) {
      var by = o.y - r - (i + 1) * B.balonYaricap * 1.7;
      c.save();
      c.strokeStyle = 'rgba(0,0,0,0.25)';      // ip
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(o.x, o.y - r);
      c.lineTo(o.x, by + B.balonYaricap);
      c.stroke();

      c.fillStyle = renk;
      c.beginPath();
      c.ellipse(o.x, by, B.balonYaricap, B.balonYaricap * 1.15, 0, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.28)';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)';  // parlama
      c.beginPath();
      c.arc(o.x - 2.5, by - 3, 2.4, 0, TAU);
      c.fill();
      c.restore();
    }

    // En üstteki balon hedeftir: kesikli halka nereye basılacağını söylüyor
    if (o.balon > 0 && o.dokunulmazlik <= 0) {
      var tepeY = o.y - r - o.balon * B.balonYaricap * 1.7;
      c.save();
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = 2;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.arc(o.x, tepeY, B.balonYaricap + 5, 0, TAU);
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }

    c.save();
    c.translate(o.x, o.y);
    if (o.dokunulmazlik > 0) {                 // vurulduktan sonra yanıp söner
      c.globalAlpha = 0.4 + Math.abs(Math.sin(Date.now() / 70)) * 0.6;
    }

    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.ellipse(0, r * 0.9, r * 0.85, r * 0.3, 0, 0, TAU);
    c.fill();

    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.stroke();

    c.fillStyle = '#2a2a2a';                   // ayaklar (silah)
    c.fillRect(-r * 0.65, r * 0.55, r * 0.5, r * 0.5);
    c.fillRect(r * 0.15, r * 0.55, r * 0.5, r * 0.5);

    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(o.bakis * 3 - 4, -3, 4, 0, TAU);
    c.arc(o.bakis * 3 + 4, -3, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(o.bakis * 4 - 4, -2.5, 2, 0, TAU);
    c.arc(o.bakis * 4 + 4, -2.5, 2, 0, TAU);
    c.fill();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillText(ad, o.x, o.y + r + 15);
    }
  }

  function parcalariCiz(c, d) {
    for (var i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2.5);
      c.fillStyle = p.renk || '#fff';
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
  }

  return { ciz: ciz };
})();
