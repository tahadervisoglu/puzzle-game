// Buz Sumo'nun çizimi. Şarj eden oyuncunun önünde nişan oku belirir —
// rakibin nereye fırlayacağını görebilmesi oyunun blöf tarafını açıyor.
MG.sumoCizim = (function () {
  var A = MG.ayar;
  var S = A.sumo;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    var gr = c.createLinearGradient(0, 0, 0, H);   // arena dışı: derin su
    gr.addColorStop(0, '#20404f');
    gr.addColorStop(1, '#132a35');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    arenaCiz(c, d);
    izleriCiz(c, d);

    for (var k in d.oyuncular) {
      if (!d.oyuncular[k].canli) {
        oyuncuCiz(c, d.oyuncular[k], A.renkler[k], '', d);
      }
    }
    for (k in d.oyuncular) {
      if (d.oyuncular[k].canli) {
        oyuncuCiz(c, d.oyuncular[k], A.renkler[k],
                  koltuklar[k] ? koltuklar[k].ad : '', d);
      }
    }

    // Kendi karakterin: üstünde ok. Herkes aynı yuvarlak olduğu için
    // sumo'da hangisi olduğunu ayırt etmek imkânsızdı.
    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - S.oyuncuYaricap - 16,
                                A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  // --- arena ---------------------------------------------------------------

  function arenaCiz(c, d) {
    var m = d.merkez, r = d.yaricap;

    c.save();
    c.beginPath();          // kenar halkası
    c.arc(m.x, m.y, r + 9, 0, TAU);
    c.fillStyle = '#b8d8e6';
    c.fill();

    var gr = c.createRadialGradient(m.x - r * 0.3, m.y - r * 0.35, r * 0.1,
                                    m.x, m.y, r);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.55, '#e4f4fb');
    gr.addColorStop(1, '#bfe3f2');
    c.beginPath();
    c.arc(m.x, m.y, r, 0, TAU);
    c.fillStyle = gr;
    c.fill();

    // Buz çatlakları — zeminin kaygan olduğunu anlatan tek görsel ipucu
    c.save();
    c.beginPath();
    c.arc(m.x, m.y, r, 0, TAU);
    c.clip();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 2;
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * TAU + 0.4;
      c.beginPath();
      c.moveTo(m.x + Math.cos(a) * r * 0.15, m.y + Math.sin(a) * r * 0.15);
      c.lineTo(m.x + Math.cos(a + 0.25) * r * 0.72, m.y + Math.sin(a + 0.25) * r * 0.72);
      c.lineTo(m.x + Math.cos(a + 0.1) * r, m.y + Math.sin(a + 0.1) * r);
      c.stroke();
    }
    c.restore();

    c.beginPath();          // dohyo çizgisi
    c.arc(m.x, m.y, r, 0, TAU);
    c.strokeStyle = '#e2554f';
    c.lineWidth = 5;
    c.stroke();

    c.beginPath();          // orta halka
    c.arc(m.x, m.y, r * 0.24, 0, TAU);
    c.strokeStyle = 'rgba(226,85,79,0.35)';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  function izleriCiz(c, d) {
    c.save();
    c.strokeStyle = 'rgba(120,170,200,0.8)';
    c.lineWidth = 3;
    for (var i = 0; i < d.izler.length; i++) {
      var z = d.izler[i];
      c.globalAlpha = Math.min(0.55, z.omur * 0.5);
      var dx = Math.cos(z.aci) * 9, dy = Math.sin(z.aci) * 9;
      c.beginPath();
      c.moveTo(z.x - dx, z.y - dy);
      c.lineTo(z.x + dx, z.y + dy);
      c.stroke();
    }
    c.restore();
  }

  // --- oyuncu --------------------------------------------------------------

  function oyuncuCiz(c, o, renk, ad, d) {
    var r = S.oyuncuYaricap;

    c.save();
    c.translate(o.x, o.y);
    if (!o.canli) {                 // düşerken küçülüp kaybolur
      var k = 1 - o.dusme;
      c.globalAlpha = Math.max(0, k);
      c.scale(Math.max(0.05, k), Math.max(0.05, k));
      c.rotate(o.dusme * 5);
    }

    if (o.canli && o.sarj > 0) sarjHalkasi(c, o, r);

    c.fillStyle = 'rgba(0,0,0,0.16)';  // gölge
    c.beginPath();
    c.ellipse(2, 4, r, r * 0.9, 0, 0, TAU);
    c.fill();

    c.fillStyle = renk;                // gövde
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.32)';
    c.lineWidth = 2.5;
    c.stroke();

    c.save();                          // kuşak
    c.rotate(o.aci);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillRect(-r, -5, r * 2, 9);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-r, 1, r * 2, 3);

    c.fillStyle = '#fff';              // gözler (baktığı yön)
    c.beginPath();
    c.arc(7, -7, 4.4, 0, TAU);
    c.arc(7, 7, 4.4, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(9, -7, 2.2, 0, TAU);
    c.arc(9, 7, 2.2, 0, TAU);
    c.fill();
    c.restore();
    c.restore();

    if (o.canli && o.sarj > 0) nisanOku(c, o, r);

    if (ad && o.canli) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fillText(ad, o.x, o.y - r - 10);
    }
  }

  // Şarj arttıkça daralan ve kızaran halka
  function sarjHalkasi(c, o, r) {
    c.save();
    var titre = o.sarj > 0.7 ? (Math.random() - 0.5) * o.sarj * 3 : 0;
    c.translate(titre, titre);
    c.beginPath();
    c.arc(0, 0, r + 12 - o.sarj * 7, 0, TAU * o.sarj);
    c.strokeStyle = o.sarj > 0.75 ? '#e2554f' : '#f2a33c';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.stroke();
    c.restore();
  }

  function nisanOku(c, o, r) {
    c.save();
    c.translate(o.x, o.y);
    c.rotate(o.aci);
    var uzun = r + 14 + o.sarj * 46;
    c.globalAlpha = 0.35 + o.sarj * 0.5;
    c.strokeStyle = o.sarj > 0.75 ? '#e2554f' : '#f2a33c';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(r + 6, 0);
    c.lineTo(uzun, 0);
    c.stroke();
    c.beginPath();
    c.moveTo(uzun + 8, 0);
    c.lineTo(uzun - 6, -7);
    c.lineTo(uzun - 6, 7);
    c.closePath();
    c.fillStyle = c.strokeStyle;
    c.fill();
    c.restore();
  }

  function parcalariCiz(c, d) {
    c.save();
    for (var i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2);
      c.fillStyle = '#dff2fa';
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.restore();
  }

  return { ciz: ciz };
})();
