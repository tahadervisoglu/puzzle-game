// Kuyruk Yakala'nın çizimi. Kuyruk ucu ayrıca vurgulanıyor — herkesin
// nereye dokunması gerektiğini bir bakışta görmesi lazım.
MG.kuyrukCizim = (function () {
  var A = MG.ayar;
  var Q = A.kuyruk;
  var W = A.dunya.w, H = A.dunya.h;
  var TAU = Math.PI * 2;

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.kuyruk;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    MG.cizimYardim.zeminDoku(c, W, H, '#2e4a3c', '#1d3129', 'rgba(255,255,255,0.04)');

    c.fillStyle = '#16241e';
    for (var i = 0; i < d.duvarlar.length; i++) {
      var dv = d.duvarlar[i];
      c.fillRect(dv.x, dv.y, dv.w, dv.h);
    }

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (o.canli) kuyrukCiz(c, o, A.renkler[k], O);
    }
    for (k in d.oyuncular) {
      var o2 = d.oyuncular[k];
      if (o2.canli) oyuncuCiz(c, o2, A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }

    var ben = d.oyuncular[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - Q.oyuncuYaricap - 15,
                                A.renkler[benKoltuk]);
    }

    parcalariCiz(c, d);
    c.restore();
  }

  function kuyrukCiz(c, o, renk, O) {
    if (!o.segmentler.length) return;
    c.save();

    c.strokeStyle = renk;                       // ip
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(o.x, o.y);
    for (var i = 0; i < o.segmentler.length; i++) {
      c.lineTo(o.segmentler[i].x, o.segmentler[i].y);
    }
    c.stroke();
    c.globalAlpha = 1;

    var son = o.segmentler.length - 1;
    for (i = 0; i < o.segmentler.length; i++) {
      var s = o.segmentler[i];
      var ucMu = i === son;
      c.beginPath();
      c.arc(s.x, s.y, ucMu ? Q.segmentYaricap + 2 : Q.segmentYaricap, 0, TAU);
      c.fillStyle = renk;
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.lineWidth = 2;
      c.stroke();

      if (ucMu) {                                // uç: kapılacak yer
        c.beginPath();
        c.arc(s.x, s.y, Q.segmentYaricap + 6, 0, TAU);
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        c.lineWidth = 2;
        c.setLineDash([4, 4]);
        c.stroke();
        c.setLineDash([]);
      }
    }
    c.restore();
  }

  function oyuncuCiz(c, o, renk, ad) {
    var r = Q.oyuncuYaricap;
    c.save();
    c.translate(o.x, o.y);
    if (o.dokunulmazlik > 0) {
      c.globalAlpha = 0.45 + Math.abs(Math.sin(Date.now() / 70)) * 0.55;
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

    if (o.bekleme <= 0) {                        // atılma hazır
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
    c.arc(5, -5, 4, 0, TAU);
    c.arc(5, 5, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(6.5, -5, 2, 0, TAU);
    c.arc(6.5, 5, 2, 0, TAU);
    c.fill();
    c.restore();
    c.restore();

    if (ad) {
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fillText(ad + ' · ' + o.kuyruk, o.x, o.y - r - 9);
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
