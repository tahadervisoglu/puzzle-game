// Kutu Kapmaca'nın çizimi. Simülasyon bilgisi yok; sadece durumu resmeder.
MG.forkliftCizim = (function () {
  var A = MG.ayar;
  var F = A.forklift;
  var W = A.dunya.w, H = A.dunya.h;

  function ciz(d, cv, c, koltuklar, sayilar) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);

    for (var k in d.alanlar) alanCiz(c, d.alanlar[k], A.renkler[k],
                                     koltuklar[k] ? koltuklar[k].ad : '',
                                     sayilar ? sayilar[k] : null);

    c.fillStyle = '#3b3b3b';
    for (var i = 0; i < d.duvarlar.length; i++) {
      var dv = d.duvarlar[i];
      c.fillRect(dv.x, dv.y, dv.w, dv.h);
    }

    // Yerdeki kutular önce, taşınanlar araçların üstünde çizilsin
    for (i = 0; i < d.kutular.length; i++) {
      if (d.kutular[i].tasiyan < 0) kutuCiz(c, d.kutular[i]);
    }
    for (k in d.araclar) {
      aracCiz(c, d.araclar[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    for (i = 0; i < d.kutular.length; i++) {
      if (d.kutular[i].tasiyan >= 0) kutuCiz(c, d.kutular[i]);
    }

    c.restore();
  }

  function alanCiz(c, al, renk, ad, sayi) {
    var x = al.x - al.yw, y = al.y - al.yh;
    c.save();
    c.globalAlpha = 0.1;
    c.fillStyle = renk;
    c.fillRect(x, y, al.yw * 2, al.yh * 2);
    c.globalAlpha = 1;
    c.strokeStyle = renk;
    c.lineWidth = 3;
    c.setLineDash([9, 6]);
    c.strokeRect(x, y, al.yw * 2, al.yh * 2);
    c.setLineDash([]);

    c.textAlign = 'center';
    c.fillStyle = renk;
    c.globalAlpha = 0.85;
    c.font = 'bold 12px system-ui, sans-serif';
    c.fillText(ad, al.x, y + 15);
    if (sayi != null) {
      c.globalAlpha = 0.4;
      c.font = 'bold 34px system-ui, sans-serif';
      c.fillText(sayi, al.x, al.y + 18);
    }
    c.restore();
  }

  function kutuCiz(c, kt) {
    var yari = F.kutuBoy / 2;
    c.save();
    c.translate(kt.x, kt.y);
    c.rotate(kt.aci);
    c.fillStyle = '#d9a441';
    c.fillRect(-yari, -yari, F.kutuBoy, F.kutuBoy);
    c.strokeStyle = '#8a6520';
    c.lineWidth = 2;
    c.strokeRect(-yari, -yari, F.kutuBoy, F.kutuBoy);
    c.beginPath(); // koli bandı
    c.moveTo(-yari, 0); c.lineTo(yari, 0);
    c.strokeStyle = 'rgba(138,101,32,0.5)';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  function aracCiz(c, f, renk, ad) {
    c.save();
    c.translate(f.x, f.y);
    c.rotate(f.aci);

    c.fillStyle = '#555'; // çatal: iki uç
    c.fillRect(8, -10, 24, 4);
    c.fillRect(8, 6, 24, 4);
    c.fillStyle = '#444'; // direk
    c.fillRect(6, -13, 5, 26);

    c.fillStyle = '#2a2a2a'; // tekerlekler
    c.fillRect(-13, -13, 8, 5);
    c.fillRect(-13, 8, 8, 5);

    c.fillStyle = renk; // gövde
    c.fillRect(-15, -11, 22, 22);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.strokeRect(-15, -11, 22, 22);

    c.fillStyle = 'rgba(0,0,0,0.28)'; // sürücü kabini
    c.fillRect(-11, -7, 12, 14);
    c.restore();

    if (ad) {
      c.save();
      c.translate(f.x, f.y);
      c.font = '11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillText(ad, 0, -22);
      c.restore();
    }
  }

  return { ciz: ciz };
})();
