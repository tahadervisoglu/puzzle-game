// Oyunların paylaştığı geometri yardımcıları.
MG.geo = (function () {
  var W = MG.ayar.dunya.w, H = MG.ayar.dunya.h;
  var KAL = 12; // duvar kalınlığı

  function cerceve() {
    return [
      { x: 0, y: 0, w: W, h: KAL },
      { x: 0, y: H - KAL, w: W, h: KAL },
      { x: 0, y: 0, w: KAL, h: H },
      { x: W - KAL, y: 0, w: KAL, h: H }
    ];
  }

  // Daire bir duvara değiyorsa o duvarı döndürür.
  function daireDuvarCarpar(x, y, r, duvarlar) {
    for (var i = 0; i < duvarlar.length; i++) {
      var d = duvarlar[i];
      var ex = Math.max(d.x, Math.min(x, d.x + d.w));
      var ey = Math.max(d.y, Math.min(y, d.y + d.h));
      var fx = x - ex, fy = y - ey;
      if (fx * fx + fy * fy < r * r) return d;
    }
    return null;
  }

  function noktaDuvarda(x, y, duvarlar) {
    for (var i = 0; i < duvarlar.length; i++) {
      var d = duvarlar[i];
      if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return true;
    }
    return false;
  }

  function aciNormalle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  // İki nokta arasında duvar var mı? (bot görüş hattı)
  function gorusTemiz(x1, y1, x2, y2, duvarlar, adim) {
    var dx = x2 - x1, dy = y2 - y1;
    var uz = Math.sqrt(dx * dx + dy * dy);
    var n = Math.max(1, Math.floor(uz / (adim || 12)));
    for (var i = 1; i < n; i++) {
      var t = i / n;
      if (noktaDuvarda(x1 + dx * t, y1 + dy * t, duvarlar)) return false;
    }
    return true;
  }

  // Bir nesne duvarın içinde kaldıysa en yakın kenardan dışarı iter.
  // Gerekli, çünkü kaydir() içeri girmiş bir nesnenin ÇIKMASINA da izin
  // vermez: her ara konum da çarpıştığı için nesne orada kilitlenir.
  function duvardanCikar(nesne, r, duvarlar) {
    for (var i = 0; i < duvarlar.length; i++) {
      var d = duvarlar[i];
      var ex = Math.max(d.x, Math.min(nesne.x, d.x + d.w));
      var ey = Math.max(d.y, Math.min(nesne.y, d.y + d.h));
      var fx = nesne.x - ex, fy = nesne.y - ey;
      var u2 = fx * fx + fy * fy;
      if (u2 >= r * r) continue;

      if (u2 > 0.0001) {           // kenara yakın: dışarı doğru it
        var u = Math.sqrt(u2);
        nesne.x = ex + (fx / u) * r;
        nesne.y = ey + (fy / u) * r;
      } else {                      // tam içinde: en yakın kenardan çıkar
        var sol = nesne.x - d.x, sag = d.x + d.w - nesne.x;
        var ust = nesne.y - d.y, alt = d.y + d.h - nesne.y;
        var en = Math.min(sol, sag, ust, alt);
        if (en === sol) nesne.x = d.x - r;
        else if (en === sag) nesne.x = d.x + d.w + r;
        else if (en === ust) nesne.y = d.y - r;
        else nesne.y = d.y + d.h + r;
      }
    }
  }

  // Eksenleri ayrı ayrı ilerlet: duvara sürtünerek kaymak mümkün olsun.
  function kaydir(nesne, vx, vy, r, duvarlar) {
    var nx = nesne.x + vx;
    if (!daireDuvarCarpar(nx, nesne.y, r, duvarlar)) nesne.x = nx;
    var ny = nesne.y + vy;
    if (!daireDuvarCarpar(nesne.x, ny, r, duvarlar)) nesne.y = ny;
  }

  return {
    KAL: KAL,
    cerceve: cerceve,
    daireDuvarCarpar: daireDuvarCarpar,
    noktaDuvarda: noktaDuvarda,
    aciNormalle: aciNormalle,
    gorusTemiz: gorusTemiz,
    kaydir: kaydir,
    duvardanCikar: duvardanCikar
  };
})();
