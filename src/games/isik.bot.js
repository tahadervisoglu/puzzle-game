// Işık Duvarı botu.
// Önündeki yol kapanmak üzereyse döner; hangi yöne döneceğine "o yönde ne
// kadar açık alan kalıyor" diye bakarak karar verir. Sadece boş hücre aramak
// yetmiyor — bot kendini kapalı bir cebe kilitliyordu.
MG.isikBot = (function () {
  var A = MG.ayar;
  var L = A.isik;

  var ILERI_BAK = 5;      // kaç hücre ileriye bakıp tehlike görsün
  var ALAN_SINIR = 90;    // flood fill bu kadar hücre sayınca yeter

  function bos(d, O, cx, cy) {
    if (cx < 0 || cy < 0 || cx >= O.sutun || cy >= O.satir) return false;
    return !d.izler[O.indeks(cx, cy)];
  }

  // O yönde kaç hücre ilerleyebiliriz?
  function acikMesafe(d, O, cx, cy, yon) {
    var dx = O.yonler[yon][0], dy = O.yonler[yon][1];
    for (var i = 1; i <= ILERI_BAK; i++) {
      if (!bos(d, O, cx + dx * i, cy + dy * i)) return i - 1;
    }
    return ILERI_BAK;
  }

  // Bir adım attıktan sonra önümüzde kalan boş alanın büyüklüğü.
  // Cebe girmeyi bu engelliyor.
  function alan(d, O, cx, cy) {
    var dx = cx, dy = cy;
    if (!bos(d, O, dx, dy)) return 0;
    var gorulen = {};
    var kuyruk = [[dx, dy]];
    gorulen[O.indeks(dx, dy)] = true;
    var sayi = 0;
    for (var b = 0; b < kuyruk.length && sayi < ALAN_SINIR; b++) {
      sayi++;
      for (var y = 0; y < 4; y++) {
        var nx = kuyruk[b][0] + O.yonler[y][0];
        var ny = kuyruk[b][1] + O.yonler[y][1];
        if (!bos(d, O, nx, ny)) continue;
        var i = O.indeks(nx, ny);
        if (gorulen[i]) continue;
        gorulen[i] = true;
        kuyruk.push([nx, ny]);
      }
    }
    return sayi;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var O = MG.oyunlar.isik;

    b.karar -= dt;
    if (b.karar > 0) return;
    // Hız arttıkça daha sık karar ver, yoksa duvara girer
    b.karar = Math.max(0.05, (L.hucre * 1.5) / Math.max(60, d.hiz));

    var ileri = acikMesafe(d, O, o.cx, o.cy, o.yon);
    if (ileri >= 3) return;             // yol açık, dokunma

    var adaylar = [(o.yon + 1) % 4, (o.yon + 3) % 4];
    if (ileri > 0) adaylar.push(o.yon);

    var enIyi = null, enIyiPuan = -1;
    for (var i = 0; i < adaylar.length; i++) {
      var y = adaylar[i];
      var m = acikMesafe(d, O, o.cx, o.cy, y);
      if (m < 1) continue;
      var nx = o.cx + O.yonler[y][0], ny = o.cy + O.yonler[y][1];
      var puan = alan(d, O, nx, ny) + m * 2;
      if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = y; }
    }
    if (enIyi == null || enIyi === o.yon) return;

    // Oyunun girdi kapısını kullan: dönüş kuralları tek yerde kalsın
    O.girdi(d, koltuk, ['d', 's', 'a', 'w'][enIyi], true);
  }

  return { guncelle: guncelle };
})();
