// Araba Yarışı'nın çizimi. Kamera oyuncunun arabasını takip eder — hız
// hissi bundan geliyor; tüm pisti ekrana sığdırmak arabaları karınca yapardı.
MG.yarisCizim = (function () {
  var A = MG.ayar;
  var Y = A.yaris;
  var P = MG.yarisPist;
  var GORUNUM = { w: A.dunya.w, h: A.dunya.h }; // mantıksal ekran

  var CIM = '#63bf47';
  var CIM_KOYU = '#57ae3e';
  var ASFALT = '#8d949b';

  function ciz(d, cv, c, koltuklar, benKoltuk, sirali) {
    var olcek = cv.width / GORUNUM.w;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    var kam = kameraHedefi(d, benKoltuk);

    c.save();
    c.translate(GORUNUM.w / 2, GORUNUM.h / 2);
    c.scale(Y.kameraZoom, Y.kameraZoom);
    c.translate(-kam.x, -kam.y);

    cimCiz(c, kam);
    pistCiz(c);
    baslangicCizgisi(c);
    izleriCiz(c, d);
    lastikleriCiz(c, d);
    for (var k in d.araclar) {
      arabaCiz(c, d.araclar[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    c.restore();

    miniHarita(c, d);
    siraGostergesi(c, d, sirali, benKoltuk);
    c.restore();
  }

  function kameraHedefi(d, benKoltuk) {
    var a = d.araclar[benKoltuk];
    if (!a) { // izleyici: ilk aracı takip et
      for (var k in d.araclar) { a = d.araclar[k]; break; }
    }
    return a ? { x: a.x, y: a.y } : { x: P.dunya.w / 2, y: P.dunya.h / 2 };
  }

  // --- zemin ve pist -------------------------------------------------------

  function cimCiz(c, kam) {
    var yari = GORUNUM.w / Y.kameraZoom;
    c.fillStyle = CIM;
    c.fillRect(kam.x - yari, kam.y - yari, yari * 2, yari * 2);
    // Şeritler zeminin kaydığını gösterir, hız hissini artırır
    c.fillStyle = CIM_KOYU;
    var adim = 90;
    var bas = Math.floor((kam.y - yari) / adim) * adim;
    for (var y = bas; y < kam.y + yari; y += adim * 2) {
      c.fillRect(kam.x - yari, y, yari * 2, adim);
    }
  }

  function pistYolu(c) {
    var n = P.noktalar;
    c.beginPath();
    c.moveTo(n[0].x, n[0].y);
    for (var i = 1; i < n.length; i++) c.lineTo(n[i].x, n[i].y);
    c.closePath();
  }

  function pistCiz(c) {
    c.lineJoin = 'round';
    c.lineCap = 'round';

    pistYolu(c); // kerb: asfalttan biraz geniş, kırmızı-beyaz
    c.strokeStyle = '#e23b3b';
    c.lineWidth = Y.pistGenislik + 16;
    c.stroke();

    pistYolu(c);
    c.strokeStyle = '#f4f4f4';
    c.lineWidth = Y.pistGenislik + 16;
    c.setLineDash([26, 26]);
    c.stroke();
    c.setLineDash([]);

    pistYolu(c); // asfalt
    c.strokeStyle = ASFALT;
    c.lineWidth = Y.pistGenislik;
    c.stroke();

    pistYolu(c); // orta çizgi
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    c.setLineDash([22, 30]);
    c.stroke();
    c.setLineDash([]);
  }

  function baslangicCizgisi(c) {
    var p = P.noktalar[0];
    var yon = P.baslangicYonu();
    c.save();
    c.translate(p.x, p.y);
    c.rotate(yon);
    var g = Y.pistGenislik, kare = 13;
    for (var i = 0; i < g / kare; i++) {
      for (var j = 0; j < 2; j++) {
        c.fillStyle = (i + j) % 2 ? '#ffffff' : '#1d1d1d';
        c.fillRect(j * kare - kare, -g / 2 + i * kare, kare, kare);
      }
    }
    c.restore();
  }

  function izleriCiz(c, d) {
    c.strokeStyle = 'rgba(40,40,40,0.28)';
    c.lineWidth = 4;
    for (var i = 0; i < d.izler.length; i++) {
      var z = d.izler[i];
      c.globalAlpha = Math.min(0.4, z.omur / 2.5);
      var dx = Math.cos(z.aci) * 7, dy = Math.sin(z.aci) * 7;
      var sx = -Math.sin(z.aci) * 6, sy = Math.cos(z.aci) * 6;
      c.beginPath();
      c.moveTo(z.x - dx + sx, z.y - dy + sy);
      c.lineTo(z.x + dx + sx, z.y + dy + sy);
      c.moveTo(z.x - dx - sx, z.y - dy - sy);
      c.lineTo(z.x + dx - sx, z.y + dy - sy);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function lastikleriCiz(c, d) {
    var r = Y.lastikYaricap;
    for (var i = 0; i < d.lastikler.length; i++) {
      var t = d.lastikler[i];
      c.beginPath();
      c.arc(t.x, t.y, r, 0, Math.PI * 2);
      c.fillStyle = '#2a2a2a';
      c.fill();
      c.beginPath();
      c.arc(t.x, t.y, r * 0.5, 0, Math.PI * 2);
      c.fillStyle = '#6b6b6b';
      c.fill();
      c.beginPath();
      c.arc(t.x - 3, t.y - 4, r * 0.75, -2.4, -0.9);
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 3;
      c.stroke();
    }
  }

  // --- araba ---------------------------------------------------------------

  function arabaCiz(c, a, renk, ad) {
    c.save();
    c.translate(a.x, a.y);
    c.rotate(a.aci);

    c.fillStyle = 'rgba(0,0,0,0.18)'; // gölge
    c.fillRect(-14, -9, 30, 20);

    c.fillStyle = '#1f1f1f'; // tekerlekler
    c.fillRect(-11, -12, 9, 5);
    c.fillRect(-11, 7, 9, 5);
    c.fillRect(7, -12, 9, 5);
    c.fillRect(7, 7, 9, 5);

    c.fillStyle = renk; // gövde
    c.fillRect(-15, -9, 30, 18);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.strokeRect(-15, -9, 30, 18);

    c.fillStyle = 'rgba(20,30,40,0.75)'; // cam
    c.fillRect(0, -6, 9, 12);
    c.fillStyle = 'rgba(255,255,255,0.35)'; // ön kanat
    c.fillRect(12, -8, 4, 16);
    c.restore();

    if (ad) {
      c.save();
      c.translate(a.x, a.y);
      c.font = 'bold 12px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.65)';
      c.fillText(ad, 0, -20);
      c.restore();
    }
  }

  // --- arayüz katmanı ------------------------------------------------------

  function miniHarita(c, d) {
    var g = 150, h = 100, x0 = GORUNUM.w - g - 14, y0 = 14;
    var ol = Math.min(g / P.dunya.w, h / P.dunya.h);

    c.save();
    c.globalAlpha = 0.82;
    c.fillStyle = '#ffffff';
    c.fillRect(x0, y0, g, h);
    c.strokeStyle = '#ccc';
    c.lineWidth = 2;
    c.strokeRect(x0, y0, g, h);

    c.translate(x0 + (g - P.dunya.w * ol) / 2, y0 + (h - P.dunya.h * ol) / 2);
    c.scale(ol, ol);

    var n = P.noktalar;
    c.beginPath();
    c.moveTo(n[0].x, n[0].y);
    for (var i = 1; i < n.length; i++) c.lineTo(n[i].x, n[i].y);
    c.closePath();
    c.strokeStyle = '#bbb';
    c.lineWidth = Y.pistGenislik * 0.8;
    c.lineJoin = 'round';
    c.stroke();

    for (var k in d.araclar) {
      var a = d.araclar[k];
      c.fillStyle = A.renkler[k];
      c.beginPath();
      c.arc(a.x, a.y, 34, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function siraGostergesi(c, d, sirali, benKoltuk) {
    var yer = sirali.indexOf(benKoltuk);
    var a = d.araclar[benKoltuk];
    if (yer < 0 || !a) return;
    var tur = Math.min(Y.turSayisi,
      Math.floor(a.ilerleme / P.noktalar.length) + (a.bitti ? 0 : 1));
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.font = 'bold 30px system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillText((yer + 1) + '/' + sirali.length, 18, 42);
    c.font = 'bold 16px system-ui, sans-serif';
    c.fillText('Tur ' + tur + '/' + Y.turSayisi, 18, 66);
    if (a.cimde) {
      c.fillStyle = 'rgba(226,59,59,0.8)';
      c.fillText('ÇİMDESİN', 18, 88);
    }
    c.restore();
  }

  return { ciz: ciz };
})();
