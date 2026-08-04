// Örümcek Kaç'ın haritaları — tank sahnesinden daha karışık, çok sayıda
// koridor ve çıkışlı odalar. Örümcek hızlı olduğu için düz kaçış hatları
// bilerek kısa tutuldu; kurtuluş köşe dönmekte.
//
// Kural: kapalı hücre bırakma. Her odanın en az iki çıkışı olmalı, yoksa
// içine giren kaçamaz ve tur kilitlenir.
MG.orumcekHarita = (function () {
  var KAL = MG.geo.KAL;

  function d(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }

  var HARITALAR = [
    { // ızgara: kısa duvarlar, bol köşe
      duvarlar: [
        d(130, 90, KAL, 130), d(130, 300, KAL, 120),
        d(260, 0, KAL, 110), d(260, 200, KAL, 150),
        d(390, 110, KAL, 120), d(390, 330, KAL, 170),
        d(520, 0, KAL, 140), d(520, 240, KAL, 130),
        d(650, 130, KAL, 130), d(650, 340, KAL, 160),
        d(130, 90, 140, KAL), d(390, 110, 140, KAL),
        d(260, 340, 140, KAL), d(520, 240, 140, KAL),
        d(130, 420, 130, KAL), d(650, 130, 140, KAL)
      ],
      dogumlar: [[65, 55], [735, 55], [65, 445], [735, 445], [400, 250]],
      orumcek: [400, 60]
    },
    { // odalar ve kapılar
      duvarlar: [
        d(200, 0, KAL, 120), d(200, 190, KAL, 130),
        d(200, 390, KAL, 110),
        d(200, 190, 180, KAL), d(200, 320, 120, KAL),
        d(380, 60, KAL, 140), d(380, 260, KAL, 130),
        d(380, 60, 130, KAL), d(440, 390, 200, KAL),
        d(560, 0, KAL, 130), d(560, 200, KAL, 140),
        d(560, 200, 180, KAL), d(620, 260, KAL, 130),
        d(60, 250, 90, KAL)
      ],
      dogumlar: [[80, 60], [700, 60], [80, 440], [720, 440], [300, 440]],
      orumcek: [470, 240]
    },
    { // zikzak koridorlar
      duvarlar: [
        // 250 uzunken sol orta bölge ana alandan kopuyordu; geçit bırakıldı
        d(0, 110, 190, KAL), d(340, 110, 250, KAL),
        d(150, 230, 250, KAL), d(490, 230, 310, KAL),
        d(0, 350, 300, KAL), d(390, 350, 250, KAL),
        d(250, 110, KAL, 120), d(590, 110, KAL, 120),
        d(150, 230, KAL, 120), d(490, 230, KAL, 120),
        // Bu duvar 150 uzunken sol alt köşe kapalı bir odaya dönüşüyor ve
        // orada başlayan oyuncu hiç çıkamıyordu. Altta geçit bırakıldı.
        d(690, 350, KAL, 150), d(300, 350, KAL, 95)
      ],
      dogumlar: [[60, 55], [740, 55], [60, 440], [740, 440], [400, 300]],
      orumcek: [400, 55]
    }
  ];

  // Tohumdan bir harita seçer; duvarlara dış çerçeve eklenmiş gelir.
  function sec(rng) {
    var h = HARITALAR[Math.floor(rng() * HARITALAR.length)];
    return {
      duvarlar: MG.geo.cerceve().concat(h.duvarlar),
      dogumlar: h.dogumlar,
      orumcek: h.orumcek
    };
  }

  return { sec: sec, haritalar: HARITALAR };
})();
