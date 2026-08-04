// Örümceğin yol bulması. Hedefe düz çizgide yürümek karışık haritada
// işe yaramıyor: duvara dayanıp kalıyor. Bunun yerine harita bir ızgaraya
// bölünür, hedeften geriye doğru BFS ile "kaç adım uzakta" haritası
// çıkarılır ve örümcek her adımda kendine en yakın daha küçük değere
// yönelir. Böylece duvarın kenarından dolaşarak ilerler.
MG.orumcekYol = (function () {
  var G = MG.geo;
  var A = MG.ayar;
  var HUCRE = 20;

  // 8 komşu: köşeleri de kullanınca yürüyüş köşeli değil akıcı olur.
  var KOMSU = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function izgaraYap(duvarlar, yaricap) {
    var w = Math.ceil(A.dunya.w / HUCRE);
    var h = Math.ceil(A.dunya.h / HUCRE);
    var gecilir = new Uint8Array(w * h);
    for (var j = 0; j < h; j++) {
      for (var i = 0; i < w; i++) {
        var x = (i + 0.5) * HUCRE, y = (j + 0.5) * HUCRE;
        gecilir[j * w + i] = G.daireDuvarCarpar(x, y, yaricap, duvarlar) ? 0 : 1;
      }
    }
    return { w: w, h: h, hucre: HUCRE, gecilir: gecilir,
             mesafe: new Int32Array(w * h) };
  }

  function hucreIndeks(iz, x, y) {
    var i = Math.floor(x / iz.hucre), j = Math.floor(y / iz.hucre);
    if (i < 0) i = 0; if (i >= iz.w) i = iz.w - 1;
    if (j < 0) j = 0; if (j >= iz.h) j = iz.h - 1;
    return j * iz.w + i;
  }

  // Hedef duvarın içinde kalırsa (köşeye sıkışmış oyuncu) en yakın
  // geçilebilir hücreye kaydır, yoksa BFS hiç başlayamaz.
  function enYakinGecilir(iz, indeks) {
    if (iz.gecilir[indeks]) return indeks;
    var i0 = indeks % iz.w, j0 = Math.floor(indeks / iz.w);
    for (var r = 1; r < 8; r++) {
      for (var j = j0 - r; j <= j0 + r; j++) {
        for (var i = i0 - r; i <= i0 + r; i++) {
          if (i < 0 || j < 0 || i >= iz.w || j >= iz.h) continue;
          if (iz.gecilir[j * iz.w + i]) return j * iz.w + i;
        }
      }
    }
    return -1;
  }

  // Hedeften geriye doğru genişleyen BFS — her hücreye kaç adımda
  // ulaşıldığını yazar. -1 = ulaşılamaz.
  function akisHesapla(iz, hedefX, hedefY) {
    var mes = iz.mesafe;
    mes.fill(-1);
    var bas = enYakinGecilir(iz, hucreIndeks(iz, hedefX, hedefY));
    if (bas < 0) return false;

    var kuyruk = [bas];
    mes[bas] = 0;
    for (var b = 0; b < kuyruk.length; b++) {
      var c = kuyruk[b];
      var ci = c % iz.w, cj = Math.floor(c / iz.w);
      for (var n = 0; n < KOMSU.length; n++) {
        var ni = ci + KOMSU[n][0], nj = cj + KOMSU[n][1];
        if (ni < 0 || nj < 0 || ni >= iz.w || nj >= iz.h) continue;
        var ind = nj * iz.w + ni;
        if (!iz.gecilir[ind] || mes[ind] >= 0) continue;
        // Çapraz geçişte iki dik komşu da açık olmalı, yoksa köşeden sızar
        if (KOMSU[n][0] && KOMSU[n][1]) {
          if (!iz.gecilir[cj * iz.w + ni] || !iz.gecilir[nj * iz.w + ci]) continue;
        }
        mes[ind] = mes[c] + 1;
        kuyruk.push(ind);
      }
    }
    return true;
  }

  // Izgarada ulaşılamaz sayılan bir hücreye düşmüşse (duvara sürtünmüş
  // olabilir) en yakın ulaşılabilir hücreyi bulur. Bu kurtarma olmadan
  // örümcek duvarın dibinde donup kalıyor.
  function enYakinUlasilir(iz, indeks) {
    var i0 = indeks % iz.w, j0 = Math.floor(indeks / iz.w);
    for (var r = 1; r <= 6; r++) {
      var enIyi = -1, enAz = Infinity;
      for (var j = j0 - r; j <= j0 + r; j++) {
        for (var i = i0 - r; i <= i0 + r; i++) {
          if (i < 0 || j < 0 || i >= iz.w || j >= iz.h) continue;
          var ind = j * iz.w + i;
          if (iz.mesafe[ind] < 0) continue;
          if (iz.mesafe[ind] < enAz) { enAz = iz.mesafe[ind]; enIyi = ind; }
        }
      }
      if (enIyi >= 0) return enIyi;
    }
    return -1;
  }

  function hucreyeDogru(iz, ind, x, y) {
    var hi = ind % iz.w, hj = Math.floor(ind / iz.w);
    var dx = (hi + 0.5) * iz.hucre - x, dy = (hj + 0.5) * iz.hucre - y;
    var uz = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / uz, y: dy / uz };
  }

  // Bulunduğu yerden bakıp en düşük mesafeli komşuya doğru birim vektör.
  function yon(iz, x, y) {
    var mes = iz.mesafe;
    var c = hucreIndeks(iz, x, y);
    var ci = c % iz.w, cj = Math.floor(c / iz.w);
    var simdiki = mes[c];
    if (simdiki === 0) return null; // hedefin hücresindeyiz

    if (simdiki < 0) {
      var kurtar = enYakinUlasilir(iz, c);
      return kurtar < 0 ? null : hucreyeDogru(iz, kurtar, x, y);
    }

    var enIyi = -1, enAz = simdiki;
    for (var n = 0; n < KOMSU.length; n++) {
      var ni = ci + KOMSU[n][0], nj = cj + KOMSU[n][1];
      if (ni < 0 || nj < 0 || ni >= iz.w || nj >= iz.h) continue;
      var ind = nj * iz.w + ni;
      if (mes[ind] < 0) continue;
      if (KOMSU[n][0] && KOMSU[n][1]) {
        if (!iz.gecilir[cj * iz.w + ni] || !iz.gecilir[nj * iz.w + ci]) continue;
      }
      if (mes[ind] < enAz) { enAz = mes[ind]; enIyi = ind; }
    }
    if (enIyi < 0) return null;
    // Komşu hücrenin ortasını hedefle — duvar kenarında titremeyi bu engelliyor
    return hucreyeDogru(iz, enIyi, x, y);
  }

  return { izgaraYap: izgaraYap, akisHesapla: akisHesapla, yon: yon };
})();
