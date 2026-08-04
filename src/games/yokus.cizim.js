// Yokuş Aşağı'nın çizimi — yan görünüm. Fizik (s, h) uzayında olduğu için
// her şey çizilmeden önce yamaç üzerinden dünya koordinatına çevrilir.
MG.yokusCizim = (function () {
  var A = MG.ayar;
  var K = A.yokus;
  var Y = MG.yokusYamac;
  var W = A.dunya.w, H = A.dunya.h;
  var KAM_X = 330;  // liderin ekrandaki yatay yeri
  var KAM_Y = 200;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.yokus;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    gokyuzu(c);

    var on = O.lider(d);
    var kam = Y.konum(d.noktalar, on);

    c.save();
    c.translate(KAM_X - kam.x, KAM_Y - kam.y);

    yamacCiz(c, d, on);
    tozlariCiz(c, d);

    var sirali = O.siralama(d);
    for (var i = sirali.length - 1; i >= 0; i--) { // öndeki üstte çizilsin
      var k = sirali[i];
      oyuncuCiz(c, d, d.oyuncular[k], A.renkler[k],
                koltuklar[k] ? koltuklar[k].ad : '', k === benKoltuk);
    }

    var ben = d.oyuncular[benKoltuk];
    if (ben) {
      var bp = Y.yuzeyUstu(d.noktalar, ben.s, ben.h + K.boy);
      MG.cizimYardim.benIsareti(c, bp.x, bp.y - 28, A.renkler[benKoltuk]);
    }
    c.restore();

    gostergeler(c, d, sirali, benKoltuk, O);
    c.restore();
  }

  function gokyuzu(c) {
    var gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#bfe6f5');
    gr.addColorStop(1, '#eaf7fb');
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
  }

  // --- yamaç ---------------------------------------------------------------

  function yamacCiz(c, d, on) {
    var bas = on - KAM_X * 1.4;
    var son = on + (W - KAM_X) * 1.4;
    var adim = Y.adim * 2;

    c.beginPath();
    var ilk = Y.konum(d.noktalar, bas);
    c.moveTo(ilk.x, ilk.y);
    for (var s = bas; s <= son; s += adim) {
      var p = Y.konum(d.noktalar, s);
      c.lineTo(p.x, p.y);
    }
    var sonN = Y.konum(d.noktalar, son);
    c.lineTo(sonN.x + 100, sonN.y + 2600);
    c.lineTo(ilk.x - 100, ilk.y + 2600);
    c.closePath();
    c.fillStyle = '#c08a52';
    c.fill();

    // Yüzeydeki kar şeridi
    c.beginPath();
    c.moveTo(ilk.x, ilk.y);
    for (s = bas; s <= son; s += adim) {
      p = Y.konum(d.noktalar, s);
      c.lineTo(p.x, p.y);
    }
    c.strokeStyle = '#f4f9fa';
    c.lineWidth = 12;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();

    agaclariCiz(c, d, bas, son);
  }

  function agaclariCiz(c, d, bas, son) {
    var adim = 210;
    var ilk = Math.floor(bas / adim) * adim;
    for (var s = ilk; s < son; s += adim) {
      var p = Y.yuzeyUstu(d.noktalar, s, 4);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.aci);
      c.fillStyle = '#7a4a25';
      c.fillRect(-4, -16, 8, 16);
      c.fillStyle = '#2f7a2c';
      for (var i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(0, -56 + i * 13);
        c.lineTo(-22 + i * 4, -22 + i * 9);
        c.lineTo(22 - i * 4, -22 + i * 9);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
  }

  function tozlariCiz(c, d) {
    c.fillStyle = '#ffffff';
    for (var i = 0; i < d.tozlar.length; i++) {
      var t = d.tozlar[i];
      var p = Y.yuzeyUstu(d.noktalar, t.s, t.h);
      c.globalAlpha = Math.min(0.7, t.omur * 2);
      c.beginPath();
      c.arc(p.x, p.y, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // --- karakter ------------------------------------------------------------

  function oyuncuCiz(c, d, o, renk, ad, benMi) {
    var b = K.boy;
    var p = Y.yuzeyUstu(d.noktalar, o.s, o.h + b / 2);

    // Gölge yamacın yüzeyinde kalır, yükseldikçe küçülür
    var golge = Y.yuzeyUstu(d.noktalar, o.s, 2);
    c.save();
    var kucul = 1 - Math.min(0.5, o.h / 240);
    c.globalAlpha = 0.26 * kucul + 0.06;
    c.fillStyle = '#000';
    c.translate(golge.x, golge.y);
    c.rotate(golge.aci);
    c.beginPath();
    c.ellipse(0, 0, (b / 2) * kucul, 5 * kucul, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.aci);
    if (o.carpma > 0) c.rotate(Math.sin(o.carpma * 45) * 0.22);

    c.fillStyle = 'rgba(160,220,245,0.5)'; // buz kalıbı
    yuvarlakKare(c, -b / 2 - 5, -b / 2 - 5, b + 10, b + 10, 8);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 2;
    c.stroke();

    c.fillStyle = renk;
    yuvarlakKare(c, -b / 2, -b / 2, b, b, 6);
    c.fill();
    c.lineWidth = benMi ? 4 : 2.5;
    c.strokeStyle = benMi ? '#1d1d1d' : 'rgba(0,0,0,0.35)';
    c.stroke();

    c.fillStyle = 'rgba(255,255,255,0.92)'; // gözler
    c.beginPath();
    c.arc(-5, -3, 4.4, 0, Math.PI * 2);
    c.arc(6, -3, 4.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(-4, -2, 2.2, 0, Math.PI * 2);
    c.arc(7, -2, 2.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.65)';
      c.fillText(ad, p.x, p.y - b / 2 - 13);
    }
  }

  // --- göstergeler ---------------------------------------------------------

  function gostergeler(c, d, sirali, benKoltuk, O) {
    c.save();
    c.textAlign = 'left';
    var yer = sirali.indexOf(benKoltuk);
    if (yer >= 0) {
      c.fillStyle = 'rgba(0,0,0,0.62)';
      c.font = 'bold 28px system-ui, sans-serif';
      c.fillText((yer + 1) + '/' + sirali.length, 16, 38);
    }
    var o = d.oyuncular[benKoltuk];
    if (o) {
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.font = 'bold 14px system-ui, sans-serif';
      c.fillText(Math.round(o.vs) + ' hız', 16, 60);
      var e = Math.tan(O.egimAci(d, o.s));
      if (e > 0.74) {
        c.fillStyle = 'rgba(226,59,59,0.85)';
        c.fillText('DİK İNİŞ', 16, 80);
      } else if (e < 0.46) {
        c.fillStyle = 'rgba(60,110,200,0.85)';
        c.fillText('düzlük', 16, 80);
      }
    }
    c.restore();
  }

  function yuvarlakKare(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  return { ciz: ciz };
})();
