// Şimşek Refleks'in çizimi: ortada beliren nesne, altta oyuncu kartları.
MG.refleksCizim = (function () {
  var A = MG.ayar;
  var W = A.dunya.w, H = A.dunya.h;
  var MERKEZ = { x: W / 2, y: 190 };
  var KUTU = 150;
  var KART = { w: 140, h: 78, y: 386, ara: 10 };

  function ciz(d, cv, c, koltuklar) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    c.textAlign = 'center';

    nesneCiz(c, d);
    kartlariCiz(c, d, koltuklar);
    balonlariCiz(c, d, koltuklar);

    c.restore();
  }

  // --- ortadaki nesne ------------------------------------------------------

  function nesneCiz(c, d) {
    if (!d.nesne) return bosCiz(c);
    var t = MG.oyunlar.refleks.tipler[d.nesne.tip];
    var yari = KUTU / 2;

    c.save();
    c.translate(MERKEZ.x, MERKEZ.y);
    // Kapılınca küçülerek kaybolsun
    if (d.nesne.kapan >= 0) {
      var o = Math.max(0, d.nesne.kalan / A.refleks.kapmaGosterimSn);
      c.globalAlpha = o;
      c.scale(0.8 + o * 0.35, 0.8 + o * 0.35);
    }
    yuvarlakKare(c, -yari, -yari, KUTU, KUTU, 18);
    c.fillStyle = t.renk;
    c.fill();

    if (t.id === 'bomba') bombaCiz(c);
    else if (t.id === 'buz') buzCiz(c);
    else {
      c.fillStyle = '#fff';
      c.font = 'bold 68px system-ui, sans-serif';
      c.textBaseline = 'middle';
      c.fillText(t.metin, 0, 4);
    }
    c.restore();
  }

  function bosCiz(c) {
    c.save();
    c.translate(MERKEZ.x, MERKEZ.y);
    c.strokeStyle = '#e0e0e0';
    c.lineWidth = 4;
    c.setLineDash([12, 10]);
    yuvarlakKare(c, -KUTU / 2, -KUTU / 2, KUTU, KUTU, 18);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#d5d5d5';
    c.font = 'bold 34px system-ui, sans-serif';
    c.textBaseline = 'middle';
    c.fillText('•••', 0, 4);
    c.restore();
  }

  function bombaCiz(c) {
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(0, 8, 38, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#8a6520'; // fitil
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(14, -22);
    c.quadraticCurveTo(34, -44, 20, -56);
    c.stroke();
    c.fillStyle = '#ff9f1c'; // kıvılcım
    c.beginPath();
    c.arc(20, -60, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; // parlama
    c.beginPath();
    c.arc(-14, -6, 11, 0, Math.PI * 2);
    c.fill();
  }

  function buzCiz(c) {
    c.strokeStyle = '#fff';
    c.lineWidth = 7;
    c.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a = (i * Math.PI) / 3;
      c.save();
      c.rotate(a);
      c.beginPath();
      c.moveTo(0, -46); c.lineTo(0, 46);
      c.moveTo(0, -46); c.lineTo(-13, -32);
      c.moveTo(0, -46); c.lineTo(13, -32);
      c.moveTo(0, 46); c.lineTo(-13, 32);
      c.moveTo(0, 46); c.lineTo(13, 32);
      c.stroke();
      c.restore();
    }
    c.lineCap = 'butt';
  }

  // --- oyuncu kartları -----------------------------------------------------

  function kartlariCiz(c, d, koltuklar) {
    var ks = Object.keys(d.oyuncular);
    var toplam = ks.length * KART.w + (ks.length - 1) * KART.ara;
    var x0 = (W - toplam) / 2;

    ks.forEach(function (k, i) {
      var x = x0 + i * (KART.w + KART.ara);
      kartCiz(c, x, d.oyuncular[k], A.renkler[k],
              koltuklar[k] ? koltuklar[k].ad : '');
    });
  }

  function kartCiz(c, x, o, renk, ad) {
    var y = KART.y, donuk = o.donma > 0;

    c.save();
    yuvarlakKare(c, x, y, KART.w, KART.h, 12);
    c.fillStyle = donuk ? '#eaf6fc' : '#fafafa';
    c.fill();
    c.lineWidth = o.parlama > 0 ? 5 : 3;
    c.strokeStyle = donuk ? '#3aa6d8' : renk;
    c.globalAlpha = o.parlama > 0 ? 1 : 0.8;
    c.stroke();
    c.globalAlpha = 1;

    var orta = x + KART.w / 2;
    c.fillStyle = renk;
    c.font = 'bold 14px system-ui, sans-serif';
    c.textBaseline = 'alphabetic';
    c.fillText(ad, orta, y + 22);

    c.fillStyle = donuk ? '#3aa6d8' : '#222';
    c.font = 'bold 30px system-ui, sans-serif';
    c.fillText(o.puan, orta, y + 54);

    if (donuk) { // kalan donma süresi
      c.fillStyle = '#3aa6d8';
      c.font = 'bold 12px system-ui, sans-serif';
      c.fillText('❄ ' + o.donma.toFixed(1) + ' sn', orta, y + 70);
    }
    c.restore();
  }

  function balonlariCiz(c, d, koltuklar) {
    var ks = Object.keys(d.oyuncular);
    var toplam = ks.length * KART.w + (ks.length - 1) * KART.ara;
    var x0 = (W - toplam) / 2;

    d.balonlar.forEach(function (b) {
      var i = ks.indexOf('' + b.koltuk);
      if (i < 0) return;
      var x = x0 + i * (KART.w + KART.ara) + KART.w / 2;
      var yukselme = (1.1 - b.omur) * 46;
      c.save();
      c.globalAlpha = Math.min(1, b.omur * 1.6);
      c.fillStyle = b.renk;
      c.font = 'bold 22px system-ui, sans-serif';
      c.fillText(b.metin, x, KART.y - 12 - yukselme);
      c.restore();
    });
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
