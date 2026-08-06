// Bomba Kaos'un ızgarası: harita üretimi, hücre erişimi ve yol bulma.
// Hem simülasyon hem bot hem çizim buradan okuyor.
MG.bombaIzgara = (function () {
  var B = MG.ayar.bomba;

  var BOS = 0, SERT = 1, KUTU = 2;

  // Izgara 800x500 dünyada ortalanır
  var GENISLIK = B.sutun * B.hucre;
  var YUKSEKLIK = B.satir * B.hucre;
  var OFS = {
    x: (MG.ayar.dunya.w - GENISLIK) / 2,
    y: (MG.ayar.dunya.h - YUKSEKLIK) / 2
  };

  function indeks(cx, cy) { return cy * B.sutun + cx; }
  function icinde(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < B.sutun && cy < B.satir;
  }

  // Hücre merkezinin dünya koordinatı
  function merkezX(cx) { return OFS.x + cx * B.hucre + B.hucre / 2; }
  function merkezY(cy) { return OFS.y + cy * B.hucre + B.hucre / 2; }
  function hucreX(x) { return Math.floor((x - OFS.x) / B.hucre); }
  function hucreY(y) { return Math.floor((y - OFS.y) / B.hucre); }

  // Klasik düzen: dış çerçeve ve çift indeksli iç sütunlar sert.
  function sertMi(cx, cy) {
    if (cx === 0 || cy === 0 || cx === B.sutun - 1 || cy === B.satir - 1) return true;
    return cx % 2 === 0 && cy % 2 === 0;
  }

  // Doğuş köşeleri: oyuncular birbirinden uzakta başlasın
  var DOGUSLAR = [
    [1, 1], [B.sutun - 2, 1], [1, B.satir - 2],
    [B.sutun - 2, B.satir - 2], [(B.sutun - 1) / 2, (B.satir - 1) / 2]
  ];

  // Doğuşun kendisi ve komşuları kutusuz kalmalı, yoksa oyuncu daha ilk
  // saniyede kendi kutusuna hapsolur.
  function dogusGuvenli(cx, cy) {
    for (var i = 0; i < DOGUSLAR.length; i++) {
      var dx = Math.abs(cx - DOGUSLAR[i][0]);
      var dy = Math.abs(cy - DOGUSLAR[i][1]);
      if (dx + dy <= 2) return true;
    }
    return false;
  }

  function haritaUret(rng) {
    var h = new Uint8Array(B.sutun * B.satir);
    for (var cy = 0; cy < B.satir; cy++) {
      for (var cx = 0; cx < B.sutun; cx++) {
        var i = indeks(cx, cy);
        if (sertMi(cx, cy)) { h[i] = SERT; continue; }
        h[i] = (!dogusGuvenli(cx, cy) && rng() < B.kutuOran) ? KUTU : BOS;
      }
    }
    return h;
  }

  // Kırılabilir kutuları bit maskesi olarak paketler. Her pakette 209
  // hücreyi tek tek göndermek pahalıydı; böyle 7 sayıya iniyor.
  function kutuMaskesi(h) {
    var m = [];
    for (var i = 0; i < h.length; i++) {
      var blok = (i / 30) | 0;
      if (m[blok] == null) m[blok] = 0;
      if (h[i] === KUTU) m[blok] |= (1 << (i % 30));
    }
    return m;
  }

  // Maskeyi uygular: sert duvarlar zaten tohumdan aynı, sadece kutular değişir.
  function maskeyiUygula(h, m) {
    for (var i = 0; i < h.length; i++) {
      if (h[i] === SERT) continue;
      var blok = (i / 30) | 0;
      var varMi = m[blok] != null && (m[blok] & (1 << (i % 30))) !== 0;
      h[i] = varMi ? KUTU : BOS;
    }
  }

  // Yol bulma: baslangıç hücresinden yürünebilir komşulara BFS.
  // gecilir(cx, cy) -> bu hücreye girilebilir mi
  // Dönen dizi: her hücre için başlangıca uzaklık (-1 ulaşılamaz)
  function bfs(bascx, bascy, gecilir) {
    var n = B.sutun * B.satir;
    var uzak = new Int16Array(n);
    for (var i = 0; i < n; i++) uzak[i] = -1;
    var bas = indeks(bascx, bascy);
    uzak[bas] = 0;
    var kuyruk = [bas];
    for (var b = 0; b < kuyruk.length; b++) {
      var c = kuyruk[b];
      var cx = c % B.sutun, cy = (c / B.sutun) | 0;
      var yonler = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var y = 0; y < 4; y++) {
        var nx = cx + yonler[y][0], ny = cy + yonler[y][1];
        if (!icinde(nx, ny)) continue;
        var ni = indeks(nx, ny);
        if (uzak[ni] >= 0 || !gecilir(nx, ny)) continue;
        uzak[ni] = uzak[c] + 1;
        kuyruk.push(ni);
      }
    }
    return uzak;
  }

  return {
    BOS: BOS, SERT: SERT, KUTU: KUTU,
    ofs: OFS, genislik: GENISLIK, yukseklik: YUKSEKLIK,
    doguslar: DOGUSLAR,
    indeks: indeks, icinde: icinde,
    merkezX: merkezX, merkezY: merkezY, hucreX: hucreX, hucreY: hucreY,
    haritaUret: haritaUret,
    kutuMaskesi: kutuMaskesi, maskeyiUygula: maskeyiUygula,
    bfs: bfs
  };
})();
