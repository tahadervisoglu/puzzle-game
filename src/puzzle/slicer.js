window.PP = window.PP || {};

// Resmi kare parçalara böler. Parça başına ayrı canvas üretmez; her parça
// kaynak resimdeki dikdörtgenini taşır ve drawImage ile oradan çizilir.
PP.slicer = {
  slice: function (source, cols, rows) {
    const sw = source.width / cols;
    const sh = source.height / rows;
    const pieces = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        pieces.push({
          id: row * cols + col,
          col: col,
          row: row,
          sx: col * sw,
          sy: row * sh,
          sw: sw,
          sh: sh,
          x: 0,
          y: 0,
          cell: -1,       // oturduğu ızgara hücresi; -1 = ızgarada değil
          cluster: -1,    // bağlı olduğu küme; -1 = ızgarada ya da henüz gelmemiş
          gx: 0,          // küme çapasına göre kafes koordinatı
          gy: 0,
          arrived: false, // masaya geldi mi
          fake: false,    // sahte parça: hiçbir hücreye oturmaz
          locked: false,  // doğru yerde yeterince durdu, artık sökülemez
          lockT: 0,       // kalıcılaşmaya kalan süre sayacı
          netBonded: false, // ağdan gelen tahtada bu parça bir kümenin üyesi
          rx: 0,          // savrulma sonrası çizim kayması (oyun mantığını etkilemez)
          ry: 0,
          pop: 0,         // yerleşme sıçraması
          lift: 0,
          held: false
        });
      }
    }

    return pieces;
  }
};
