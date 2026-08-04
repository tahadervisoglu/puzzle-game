// Oyunların paylaştığı çizim parçaları.
MG.cizimYardim = (function () {

  // Kendi karakterinin üstünde duran, hafifçe zıplayan ok. Kalabalık
  // sahnelerde "hangisi benim?" sorusunu ortadan kaldırıyor.
  function benIsareti(c, x, y, renk) {
    var t = (Date.now() % 900) / 900;
    var zipla = Math.sin(t * Math.PI * 2) * 3;
    c.save();
    c.translate(x, y - 6 + zipla);

    c.beginPath();                 // aşağı bakan üçgen
    c.moveTo(0, 8);
    c.lineTo(-8, -6);
    c.lineTo(8, -6);
    c.closePath();
    c.fillStyle = renk || '#1d1d1d';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 2.5;
    c.stroke();
    c.restore();
  }

  // Oyun alanı için yumuşak arka plan. Beyaz zemin fazla klinik duruyordu.
  function zeminDoku(c, w, h, ust, alt, cizgi) {
    var gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, ust);
    gr.addColorStop(1, alt);
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);

    if (!cizgi) return;
    c.save();
    c.strokeStyle = cizgi;
    c.lineWidth = 1;
    for (var x = 40; x < w; x += 40) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (var y = 40; y < h; y += 40) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    c.restore();
  }

  return { benIsareti: benIsareti, zeminDoku: zeminDoku };
})();
