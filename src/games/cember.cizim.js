// Çember Kaçış'ın çizimi. Boşluk saldırısı açıldığında çemberin o yayı
// gerçekten çizilmez — oyuncu nereye basacağını gözüyle görmeli.
MG.cemberCizim = (function () {
  var A = MG.ayar;
  var C = A.cember;
  var W = A.dunya.w, H = A.dunya.h;
  var MERKEZ = { x: W / 2, y: H / 2 };
  var TAU = Math.PI * 2;
  var DIS = 460; // ışınların uzandığı mesafe

  function ciz(d, cv, c, koltuklar, zorluk) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);

    c.fillStyle = '#f7f4fb';
    c.fillRect(0, 0, W, H);

    c.save();
    c.translate(MERKEZ.x, MERKEZ.y);

    cemberCiz(c, d);
    saldirilariCiz(c, d);
    mermileriCiz(c, d);
    canavarCiz(c, d);
    for (var k in d.oyuncular) {
      oyuncuCiz(c, d.oyuncular[k], A.renkler[k], koltuklar[k] ? koltuklar[k].ad : '');
    }
    parcalariCiz(c, d);

    c.restore();
    zorlukCiz(c, zorluk);
    c.restore();
  }

  // --- çember --------------------------------------------------------------

  // Açık boşlukların denk geldiği yaylar atlanarak çizilir.
  function cemberCiz(c, d) {
    var acikliklar = d.saldirilar.filter(function (s) {
      return s.tip === 'bosluk' && s.evre === 'aktif';
    });

    c.lineWidth = 16;
    c.strokeStyle = '#d9d2e6';
    var adim = TAU / 240;
    c.beginPath();
    var cizen = false;
    for (var a = 0; a <= TAU + adim; a += adim) {
      var bosMu = acikliklar.some(function (s) {
        return Math.abs(fark(a, s.aci)) < s.genislik / 2;
      });
      if (bosMu) { cizen = false; continue; }
      var x = Math.cos(a) * C.yaricap, y = Math.sin(a) * C.yaricap;
      if (!cizen) { c.moveTo(x, y); cizen = true; } else c.lineTo(x, y);
    }
    c.stroke();
  }

  function fark(a, b) {
    var f = (a - b) % TAU;
    if (f > Math.PI) f -= TAU;
    if (f < -Math.PI) f += TAU;
    return f;
  }

  // --- saldırılar ----------------------------------------------------------

  function saldirilariCiz(c, d) {
    d.saldirilar.forEach(function (s) {
      if (s.tip === 'isin') isinCiz(c, s);
      else boslukCiz(c, s);
    });
  }

  function isinCiz(c, s) {
    var y = s.genislik / 2;
    c.save();
    c.rotate(s.aci);
    if (s.evre === 'uyari') {
      c.fillStyle = 'rgba(226,59,59,0.18)';
      dilim(c, y, DIS);
      c.fill();
      c.strokeStyle = 'rgba(226,59,59,0.8)';
      c.lineWidth = 2;
      c.setLineDash([10, 8]);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(DIS, 0);
      c.stroke();
      c.setLineDash([]);
    } else {
      c.fillStyle = 'rgba(255,60,60,0.85)';
      dilim(c, y, DIS);
      c.fill();
      c.strokeStyle = '#fff'; // parlak çekirdek
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(DIS, 0);
      c.stroke();
    }
    c.restore();
  }

  function dilim(c, yariAci, r) {
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, r, -yariAci, yariAci);
    c.closePath();
  }

  function boslukCiz(c, s) {
    if (s.evre !== 'uyari') return; // açıldığında zaten çember çizilmiyor
    c.save();
    c.rotate(s.aci);
    c.strokeStyle = 'rgba(255,159,28,0.95)';
    c.lineWidth = 16;
    c.setLineDash([9, 9]);
    c.beginPath();
    c.arc(0, 0, C.yaricap, -s.genislik / 2, s.genislik / 2);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  function mermileriCiz(c, d) {
    d.mermiler.forEach(function (m) {
      var x = Math.cos(m.aci) * m.r, y = Math.sin(m.aci) * m.r;
      c.save();
      c.strokeStyle = 'rgba(226,59,59,0.35)'; // kuyruk
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(Math.cos(m.aci) * (m.r - 26), Math.sin(m.aci) * (m.r - 26));
      c.lineTo(x, y);
      c.stroke();
      c.fillStyle = '#e23b3b';
      c.beginPath();
      c.arc(x, y, 9, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath();
      c.arc(x - 2, y - 3, 3, 0, TAU);
      c.fill();
      c.restore();
    });
  }

  // --- canavar -------------------------------------------------------------

  function canavarCiz(c, d) {
    var nabiz = 1 + Math.sin(d.gecen * 4) * 0.04;
    c.save();
    c.scale(nabiz, nabiz);
    c.fillStyle = '#6b4b9a';
    c.beginPath();
    c.arc(0, 0, 42, 0, TAU);
    c.fill();
    c.fillStyle = '#5a3f85';
    c.beginPath();
    c.arc(-22, -18, 16, 0, TAU);
    c.arc(24, -14, 13, 0, TAU);
    c.arc(6, 26, 14, 0, TAU);
    c.fill();

    gozCiz(c, -12, -4, 13);
    gozCiz(c, 14, 2, 10);
    c.restore();
  }

  function gozCiz(c, x, y, r) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.fillStyle = '#e2536b';
    c.beginPath();
    c.arc(x + 1, y + 1, r * 0.55, 0, TAU);
    c.fill();
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(x + 1, y + 1, r * 0.28, 0, TAU);
    c.fill();
  }

  // --- oyuncular -----------------------------------------------------------

  function oyuncuCiz(c, o, renk, ad) {
    var r = C.yaricap + (o.canli ? 0 : o.dusme * 90); // elenince dışa savrulur
    var x = Math.cos(o.aci) * r, y = Math.sin(o.aci) * r;

    c.save();
    c.translate(x, y);
    if (!o.canli) {
      c.globalAlpha = Math.max(0, 1 - o.dusme);
      c.rotate(o.dusme * 4);
    }
    c.fillStyle = renk;
    c.beginPath();
    c.arc(0, 0, C.oyuncuYaricap, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.lineWidth = 2;
    c.stroke();

    // merkeze bakan iki göz
    c.save();
    c.rotate(Math.atan2(-y, -x));
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(4, -5, 4, 0, TAU);
    c.arc(4, 5, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(5, -5, 2, 0, TAU);
    c.arc(5, 5, 2, 0, TAU);
    c.fill();
    c.restore();
    c.restore();

    if (ad && o.canli) {
      c.save();
      c.font = 'bold 11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillText(ad, x * 1.14, y * 1.14 + 4);
      c.restore();
    }
  }

  function parcalariCiz(c, d) {
    d.parcalar.forEach(function (p) {
      c.globalAlpha = Math.min(1, p.omur * 2);
      c.fillStyle = '#e23b3b';
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    c.globalAlpha = 1;
  }

  function zorlukCiz(c, zorluk) {
    c.save();
    c.font = 'bold 15px system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(0,0,0,0.45)';
    // İçeride 5'ten başlıyor ama oyuncuya 1'den saymak daha anlaşılır
    c.fillText('Zorluk ' + Math.floor(zorluk - C.baslangicZorluk + 1), 18, 30);
    c.restore();
  }

  return { ciz: ciz };
})();
