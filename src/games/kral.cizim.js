// Kral Tepesi'nin çizimi. Tepenin içi ve dışı net ayrılmalı: oyuncunun
// puan kazanıp kazanmadığını bir bakışta anlaması gerekiyor.
MG.kralCizim = (function () {
  var A = MG.ayar;
  var K = A.kral;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.kral;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    MG.cizimYardim.zeminDoku(c, W, H, '#3b4a63', '#26314a', 'rgba(255,255,255,0.04)');
    tepeCiz(c, d);

    c.fillStyle = '#1d2534';
    for (var i = 0; i < d.duvarlar.length; i++) {
      var dv = d.duvarlar[i];
      c.fillRect(dv.x, dv.y, dv.w, dv.h);
    }

    dalgalariCiz(c, d);
    for (var k in d.oyuncular) {
      oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    var ben = d.oyuncular[benKoltuk];
    if (ben) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - K.oyuncuYaricap - 15,
                                A.renkler[benKoltuk]);
    }

    skorTablosu(c, d, O, koltuklar);
    c.restore();
  }

  function tepeCiz(c, d) {
    var r = K.tepeYaricap;
    var nabiz = 1 + Math.sin(Date.now() / 320) * 0.02;

    c.save();
    c.translate(d.tepe.x, d.tepe.y);
    c.scale(nabiz, nabiz);

    var gr = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    gr.addColorStop(0, 'rgba(255, 209, 102, 0.42)');
    gr.addColorStop(1, 'rgba(255, 149, 60, 0.12)');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();

    c.strokeStyle = '#ffd166';
    c.lineWidth = 4;
    c.setLineDash([12, 8]);
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = 'rgba(255,209,102,0.55)';   // taç
    c.font = 'bold 26px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('♛', 0, 1);
    c.textBaseline = 'alphabetic';
    c.restore();
  }

  // Darbe artık yönlü: dalga da tam bir halka değil, baktığın yöndeki yay
  function dalgalariCiz(c, d) {
    var yariAci = Math.acos(K.omuzKoni);
    for (var i = 0; i < d.dalgalar.length; i++) {
      var w = d.dalgalar[i];
      var t = 1 - w.omur / 0.35;
      c.save();
      c.translate(w.x, w.y);
      c.rotate(w.aci || 0);
      c.globalAlpha = (1 - t) * 0.9;
      c.fillStyle = w.renk;
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, K.omuzMenzil * (0.4 + t * 0.6), -yariAci, yariAci);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  function oyuncuCiz(c, o, renk, ad) {
    var r = K.oyuncuYaricap;
    c.save();
    c.translate(o.x, o.y);

    if (o.tepede) {                    // tepedeyken altın hale
      c.globalAlpha = 0.5;
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.arc(0, 0, r + 7, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }

    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(0, r * 0.85, r * 0.9, r * 0.35, 0, 0, TAU);
    c.fill();

    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2.5;
    c.stroke();

    // Omuz hazırsa parlak kenar, doluyorsa soluk
    if (o.bekleme <= 0) {
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, r - 4, 0, TAU);
      c.stroke();
    }

    c.save();
    c.rotate(o.aci);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(6, -5, 4.2, 0, TAU);
    c.arc(6, 5, 4.2, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(7.5, -5, 2, 0, TAU);
    c.arc(7.5, 5, 2, 0, TAU);
    c.fill();
    c.restore();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fillText(ad, o.x, o.y - r - 9);
    }
  }

  // Sol üstte canlı puan sıralaması — kimse elenmediği için gerilim burada
  function skorTablosu(c, d, O, koltuklar) {
    var sirali = O.siralama(d);
    c.save();
    c.textAlign = 'left';
    c.font = 'bold 13px system-ui, sans-serif';
    for (var i = 0; i < sirali.length; i++) {
      var k = sirali[i];
      var y = 26 + i * 19;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(12, y - 12, 138, 17);
      c.fillStyle = A.renkler[k];
      c.fillRect(12, y - 12, 4, 17);
      c.fillStyle = 'rgba(255,255,255,0.92)';
      var ad = koltuklar[k] ? koltuklar[k].ad : '';
      c.fillText((i + 1) + '. ' + ad, 22, y);
      c.textAlign = 'right';
      c.fillText(Math.round(d.skor[k] || 0), 146, y);
      c.textAlign = 'left';
    }
    c.restore();
  }

  return { ciz: ciz };
})();
