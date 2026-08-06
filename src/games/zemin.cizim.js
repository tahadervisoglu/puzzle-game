// Zemin Çöküyor'un çizimi. Karo çatladıkça hem rengi kızarır hem titrer —
// oyuncunun kaç saniyesi kaldığını gözle görebilmesi şart.
MG.zeminCizim = (function () {
  var A = MG.ayar;
  var Z = A.zemin;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.zemin;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    var gr = c.createLinearGradient(0, 0, 0, H);   // altındaki boşluk
    gr.addColorStop(0, '#1b2233');
    gr.addColorStop(1, '#0c0f18');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    for (var i = 0; i < d.karolar.length; i++) karoCiz(c, d.karolar[i], O);

    // Düşenler önce çizilsin, ayaktakiler üstte kalsın
    for (var k in d.oyuncular) {
      if (!d.oyuncular[k].canli) oyuncuCiz(c, d.oyuncular[k], A.renkler[k], '');
    }
    for (k in d.oyuncular) {
      if (d.oyuncular[k].canli) {
        oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
      }
    }

    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - Z.oyuncuYaricap - 15,
                                A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  function altigenYol(c, x, y, r) {
    c.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  function karoCiz(c, kr, O) {
    if (kr.durum === O.YOK) return;
    var r = Z.yaricap - 1.5;
    var x = kr.x, y = kr.y;
    var ust = '#5cc4e0', alt = '#2f7f96';

    if (kr.durum === O.CATLAK) {
      // Sayaç azaldıkça kızar ve titrer
      var oran = Math.max(0, Math.min(1, kr.sayac / Z.catlamaSn));
      ust = oran > 0.5 ? '#e8c04a' : '#e2704a';
      alt = oran > 0.5 ? '#a9832a' : '#a03d28';
      var titre = (1 - oran) * 2.2;
      x += (Math.random() - 0.5) * titre;
      y += (Math.random() - 0.5) * titre;
    }

    c.save();
    if (kr.durum === O.DUSUYOR) {
      var d0 = 1 - Math.max(0, kr.sayac / Z.dusmeSn);
      c.globalAlpha = 1 - d0;
      y += d0 * 60;                 // aşağı süzülerek kaybolur
      c.translate(x, y);
      c.scale(1 - d0 * 0.35, 1 - d0 * 0.35);
      c.translate(-x, -y);
      ust = '#7a5c52'; alt = '#4a352f';
    }

    altigenYol(c, x, y + 5, r);     // kalınlık hissi için alt yüz
    c.fillStyle = alt;
    c.fill();

    altigenYol(c, x, y, r);
    c.fillStyle = ust;
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2;
    c.stroke();

    if (kr.durum === O.CATLAK) {    // çatlak çizgileri
      c.strokeStyle = 'rgba(70,20,10,0.45)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - r * 0.5, y - r * 0.3);
      c.lineTo(x + r * 0.1, y + r * 0.1);
      c.lineTo(x - r * 0.15, y + r * 0.55);
      c.moveTo(x + r * 0.1, y + r * 0.1);
      c.lineTo(x + r * 0.6, y - r * 0.35);
      c.stroke();
    }
    c.restore();
  }

  function oyuncuCiz(c, o, renk, ad) {
    var r = Z.oyuncuYaricap;
    c.save();
    c.translate(o.x, o.y);
    if (!o.canli) {                 // boşluğa düşerken küçülüp kaybolur
      var k = 1 - o.dusme;
      c.globalAlpha = Math.max(0, k);
      c.translate(0, o.dusme * 70);
      c.scale(Math.max(0.05, k), Math.max(0.05, k));
      c.rotate(o.dusme * 3);
    }

    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.beginPath();
    c.ellipse(0, r * 0.9, r * 0.85, r * 0.35, 0, 0, TAU);
    c.fill();

    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
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
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fillText(ad, o.x, o.y - r - 8);
    }
  }

  function parcalariCiz(c, d) {
    for (var i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2.5);
      c.fillStyle = '#7fd4ea';
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
  }

  return { ciz: ciz };
})();
