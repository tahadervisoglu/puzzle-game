// Ok Refleksi'nin çizimi — her oyuncuya bir şerit. Sıradaki ok solda büyük
// ve parlak, arkadan gelenler küçülerek soluklaşıyor: gözün nereye bakacağı
// belli olsun.
MG.okCizim = (function () {
  var A = MG.ayar;
  var R = A.ok;
  var W = A.dunya.w, H = A.dunya.h;

  var SERIT = { x: 16, w: W - 32, ust: 18, ara: 6 };

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var O = MG.oyunlar.ok;
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    MG.cizimYardim.zeminDoku(c, W, H, '#eef1f6', '#dce1ea', 'rgba(0,0,0,0.03)');

    var ks = Object.keys(d.oyuncular);
    var yukseklik = (H - SERIT.ust * 2 - (ks.length - 1) * SERIT.ara) / ks.length;

    // Sıralamaya göre değil koltuk sırasına göre çiz: şeritler yer değiştirip
    // oyuncunun gözünü kaçırmasın
    ks.forEach(function (k, i) {
      var y = SERIT.ust + i * (yukseklik + SERIT.ara);
      seritCiz(c, d, O, +k, d.oyuncular[k], y, yukseklik,
               koltuklar[k] ? koltuklar[k].ad : '', +k === benKoltuk);
    });

    balonlariCiz(c, d, ks, yukseklik);
    c.restore();
  }

  function seritCiz(c, d, O, koltuk, o, y, h, ad, benMi) {
    var renk = A.renkler[koltuk];
    var donuk = o.donma > 0;

    c.save();
    yuvarlakKare(c, SERIT.x, y, SERIT.w, h, 12);
    c.fillStyle = donuk ? 'rgba(226,85,79,0.16)' : 'rgba(255,255,255,0.75)';
    c.fill();
    c.lineWidth = benMi ? 4 : 2;
    c.strokeStyle = donuk ? '#e2554f' : (benMi ? renk : 'rgba(0,0,0,0.12)');
    c.stroke();
    c.restore();

    // Sol blok: isim ve sayaç
    c.save();
    c.textAlign = 'left';
    c.fillStyle = renk;
    c.font = 'bold 14px system-ui, sans-serif';
    c.fillText(ad, SERIT.x + 14, y + h * 0.42);
    c.fillStyle = donuk ? '#e2554f' : '#222';
    c.font = 'bold 26px system-ui, sans-serif';
    c.fillText(o.indeks, SERIT.x + 14, y + h * 0.85);
    c.restore();

    // Ok akışı
    var basX = SERIT.x + 118;
    var okBoy = Math.min(h * 0.62, 44);
    for (var i = 0; i < R.gorunenOk; i++) {
      var yon = d.dizi[(o.indeks + i) % d.dizi.length];
      var ilk = i === 0;
      var olcek = ilk ? 1 : 0.72;
      var x = basX + i * (okBoy * 0.95 + 12);
      if (x + okBoy > SERIT.x + SERIT.w) break;
      okCiz(c, x, y + h / 2, okBoy * olcek, yon, renk, ilk, donuk, o.parlama);
    }
    c.restore();
  }

  function okCiz(c, x, y, boy, yon, renk, ilk, donuk, parlama) {
    c.save();
    c.translate(x + boy / 2, y);
    c.rotate(yon * Math.PI / 2);

    var yari = boy / 2;
    if (ilk) {
      c.fillStyle = donuk ? '#c9a0a0' : renk;
      if (parlama > 0) {                    // doğru basıldığı an kısa parlama
        c.shadowColor = renk;
        c.shadowBlur = 18 * (parlama / 0.25);
      }
    } else {
      c.fillStyle = 'rgba(0,0,0,0.16)';
    }

    yuvarlakKare(c, -yari, -yari, boy, boy, boy * 0.22);
    c.fill();
    c.shadowBlur = 0;

    // Ok şekli (sağa bakar, dönüşü dış rotasyon veriyor)
    c.fillStyle = ilk ? '#ffffff' : 'rgba(255,255,255,0.85)';
    var b = boy;
    c.beginPath();
    c.moveTo(b * 0.30, 0);
    c.lineTo(b * 0.02, -b * 0.25);
    c.lineTo(b * 0.02, -b * 0.10);
    c.lineTo(-b * 0.30, -b * 0.10);
    c.lineTo(-b * 0.30, b * 0.10);
    c.lineTo(b * 0.02, b * 0.10);
    c.lineTo(b * 0.02, b * 0.25);
    c.closePath();
    c.fill();
    c.restore();
  }

  function balonlariCiz(c, d, ks, yukseklik) {
    d.balonlar.forEach(function (b) {
      var i = ks.indexOf('' + b.koltuk);
      if (i < 0) return;
      var y = SERIT.ust + i * (yukseklik + SERIT.ara) + yukseklik / 2;
      c.save();
      c.globalAlpha = Math.min(1, b.omur * 1.6);
      c.fillStyle = b.renk;
      c.font = 'bold 18px system-ui, sans-serif';
      c.textAlign = 'right';
      c.fillText(b.metin, SERIT.x + SERIT.w - 16, y + 6 - (0.9 - b.omur) * 22);
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
