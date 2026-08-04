// Yarış pistinin geometrisi: kontrol noktalarından yumuşak kapalı bir devre
// üretir, "pistte miyim" ve "ne kadar ilerledim" sorularını yanıtlar.
// Hem simülasyon hem çizim bunu kullanır.
MG.yarisPist = (function () {
  var Y = MG.ayar.yaris;

  // Elle çizilmiş devre. Kesişmemeli; düzenlerken şekli koru.
  var KONTROL = [
    [360, 190], [1010, 130], [1610, 250], [1830, 610],
    [1610, 960], [1060, 1160], [500, 1090], [225, 760], [265, 400]
  ];
  var ORNEK = 14; // her kontrol aralığında kaç nokta üretilsin
  var DUNYA = { w: 2050, h: 1300 };

  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
                  (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                  (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  // Kapalı Catmull-Rom: kontrol noktaları arasını yumuşatarak örnekler.
  function merkezCizgi() {
    var n = KONTROL.length;
    var nk = [];
    for (var i = 0; i < n; i++) {
      var p0 = KONTROL[(i - 1 + n) % n], p1 = KONTROL[i];
      var p2 = KONTROL[(i + 1) % n], p3 = KONTROL[(i + 2) % n];
      for (var j = 0; j < ORNEK; j++) {
        var t = j / ORNEK;
        nk.push({
          x: catmull(p0[0], p1[0], p2[0], p3[0], t),
          y: catmull(p0[1], p1[1], p2[1], p3[1], t)
        });
      }
    }
    return nk;
  }

  var NOKTALAR = merkezCizgi();

  // Bir noktanın merkez çizgiye uzaklığı ve en yakın nokta indeksi.
  // yakinIndeks verilirse arama onun çevresiyle sınırlanır (her karede
  // 5 araç × 126 nokta taramamak için).
  function enYakin(x, y, yakinIndeks) {
    var n = NOKTALAR.length;
    var bas = 0, adet = n;
    if (yakinIndeks != null) { bas = yakinIndeks - 10; adet = 21; }
    var enIyi = 0, enAz = Infinity;
    for (var k = 0; k < adet; k++) {
      var i = ((bas + k) % n + n) % n;
      var dx = NOKTALAR[i].x - x, dy = NOKTALAR[i].y - y;
      var u = dx * dx + dy * dy;
      if (u < enAz) { enAz = u; enIyi = i; }
    }
    return { indeks: enIyi, mesafe: Math.sqrt(enAz) };
  }

  function pistte(x, y, yakinIndeks) {
    return enYakin(x, y, yakinIndeks).mesafe <= Y.pistGenislik / 2;
  }

  // Başlangıç çizgisi 0. noktada; ızgara arkasına doğru dizilir.
  function baslangicYonu() {
    var a = NOKTALAR[0], b = NOKTALAR[1];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  function izgaraYeri(sira) {
    var yon = baslangicYonu();
    var sag = yon + Math.PI / 2;
    var p = NOKTALAR[0];
    var geri = 40 + Math.floor(sira / 2) * 52;   // ikişerli dizil
    var yan = (sira % 2 === 0 ? -1 : 1) * 34;
    return {
      x: p.x - Math.cos(yon) * geri + Math.cos(sag) * yan,
      y: p.y - Math.sin(yon) * geri + Math.sin(sag) * yan,
      aci: yon
    };
  }

  return {
    noktalar: NOKTALAR,
    dunya: DUNYA,
    enYakin: enYakin,
    pistte: pistte,
    izgaraYeri: izgaraYeri,
    baslangicYonu: baslangicYonu
  };
})();
