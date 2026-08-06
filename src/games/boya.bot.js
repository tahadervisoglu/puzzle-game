// Renk Kapma botu.
// Zemini kaba bir ızgaraya bölüp hangi bölgede kendi rengi az ise oraya
// gider. Sadece "en yakın boyasız kare"ye koşan bot kendi boyasının
// kenarında gidip geliyordu.
MG.boyaBot = (function () {
  var A = MG.ayar;
  var Y = A.boya;
  var W = A.dunya.w, H = A.dunya.h;

  var BOLGE_X = 5, BOLGE_Y = 4;

  function bolgePuani(d, O, koltuk, bx, by) {
    var sutunBas = Math.floor(bx * O.sutun / BOLGE_X);
    var sutunSon = Math.floor((bx + 1) * O.sutun / BOLGE_X);
    var satirBas = Math.floor(by * O.satir / BOLGE_Y);
    var satirSon = Math.floor((by + 1) * O.satir / BOLGE_Y);
    var kazanc = 0;
    for (var cy = satirBas; cy < satirSon; cy += 2) {
      for (var cx = sutunBas; cx < sutunSon; cx += 2) {
        var v = d.zemin[O.indeks(cx, cy)];
        if (v !== koltuk + 1) kazanc++;   // boyasız da rakibinki de kazanç
      }
    }
    return kazanc;
  }

  // Hedef bölgenin MERKEZİ değil, içinde hâlâ boyanmamış bir nokta seçilir.
  // Merkezi hedefleyen bot oraya varır, aynı bölge yine en kazançlı görünür
  // ve bot 40 piksellik alanda salınıp kalırdı.
  function bolgedeHedef(d, O, koltuk, bx, by) {
    var sutunBas = Math.floor(bx * O.sutun / BOLGE_X);
    var sutunSon = Math.floor((bx + 1) * O.sutun / BOLGE_X);
    var satirBas = Math.floor(by * O.satir / BOLGE_Y);
    var satirSon = Math.floor((by + 1) * O.satir / BOLGE_Y);
    var enIyi = null, enAz = Infinity;
    for (var cy = satirBas; cy < satirSon; cy++) {
      for (var cx = sutunBas; cx < sutunSon; cx++) {
        if (d.zemin[O.indeks(cx, cy)] === koltuk + 1) continue;
        var x = cx * Y.hucre + Y.hucre / 2, y = cy * Y.hucre + Y.hucre / 2;
        var uz = Math.hypot(x - d.oyuncular[koltuk].x, y - d.oyuncular[koltuk].y);
        if (uz > 25 && uz < enAz) { enAz = uz; enIyi = { x: x, y: y }; }
      }
    }
    if (enIyi) return enIyi;
    return { x: (bx + 0.5) * W / BOLGE_X, y: (by + 0.5) * H / BOLGE_Y };
  }

  function hedefSec(d, O, koltuk, o) {
    var enIyi = null, enIyiPuan = -Infinity;
    for (var by = 0; by < BOLGE_Y; by++) {
      for (var bx = 0; bx < BOLGE_X; bx++) {
        var mx = (bx + 0.5) * W / BOLGE_X;
        var my = (by + 0.5) * H / BOLGE_Y;
        var uz = Math.hypot(mx - o.x, my - o.y);
        // Kazanç önemli ama uzak bölgeye koşarken geçen süre de kayıp
        var puan = bolgePuani(d, O, koltuk, bx, by) * 3 - uz * 0.5;
        if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = { bx: bx, by: by }; }
      }
    }
    return enIyi ? bolgedeHedef(d, O, koltuk, enIyi.bx, enIyi.by) : null;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    var O = MG.oyunlar.boya;
    g.w = g.a = g.s = g.d = false;

    b.karar -= dt;
    var vardi = b.hedef && Math.hypot(b.hedef.x - o.x, b.hedef.y - o.y) < 14;
    if (b.karar <= 0 || !b.hedef || vardi) {
      b.karar = Y.botKararSn;
      b.hedef = hedefSec(d, O, koltuk, o);
    }
    if (!b.hedef) return;

    var dx = b.hedef.x - o.x, dy = b.hedef.y - o.y;
    if (dx > 4) g.d = true; else if (dx < -4) g.a = true;
    if (dy > 4) g.s = true; else if (dy < -4) g.w = true;
  }

  return { guncelle: guncelle };
})();
