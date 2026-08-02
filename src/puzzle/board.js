window.PP = window.PP || {};

// Ortadaki birleştirme ızgarası. Hücreye bırakılan parça doğru da olsa
// yanlış da olsa oturur — oyun hangisinin yanlış olduğunu söylemez.
PP.Board = function () {
  const state = {
    cols: 0, rows: 0, size: 0,
    x: 0, y: 0, w: 0, h: 0,
    baseX: 0, baseY: 0,   // sarsıntısız konum
    shaking: false,
    cells: [],          // hücre başına parça id'si ya da null
    targets: [],        // sürüklenen kümenin oturacağı hücreler
    swapTarget: -1      // dolu hücre: bırakılırsa yer değiştirilecek
  };

  function reset() {
    state.cells = [];
    for (let i = 0; i < state.cols * state.rows; i++) state.cells.push(null);
  }

  return {
    state: state,

    layout: function (canvasW, canvasH, cols, rows, size) {
      const shapeChanged = cols !== state.cols || rows !== state.rows;
      state.cols = cols;
      state.rows = rows;
      state.size = size;
      state.w = cols * size;
      state.h = rows * size;
      state.baseX = Math.round((canvasW - state.w) / 2);
      state.baseY = Math.round((canvasH - state.h) / 2);
      state.x = state.baseX;
      state.y = state.baseY;
      if (shapeChanged || state.cells.length !== cols * rows) reset();
    },

    // Deprem: ızgaranın GERÇEK konumu kayar. Hem çizim hem yerleştirme aynı
    // konumu kullandığı için gördüğünüz yer doğru yerdir — ama ızgara hareket
    // ettiği için nişan aldığınız hücre siz bırakana kadar kaymış olabilir.
    shake: function (dx, dy) {
      state.x = state.baseX + dx;
      state.y = state.baseY + dy;
      state.shaking = !!(dx || dy);
    },

    reset: reset,

    cellX: function (i) { return state.x + (i % state.cols) * state.size; },
    cellY: function (i) { return state.y + Math.floor(i / state.cols) * state.size; },

    inBounds: function (col, row) {
      return col >= 0 && row >= 0 && col < state.cols && row < state.rows;
    },

    isFree: function (cell, pieceId) {
      return state.cells[cell] === null || state.cells[cell] === pieceId;
    },

    occupy: function (cell, pieceId) { state.cells[cell] = pieceId; },

    release: function (pieceId) {
      for (let i = 0; i < state.cells.length; i++) {
        if (state.cells[i] === pieceId) state.cells[i] = null;
      }
    },

    // Doğru hücreye oturan parça sayısı — hangisinin yanlış olduğu
    // söylenmez, sadece toplam ilerleme bilinir.
    correctCount: function (pieces) {
      let n = 0;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (p.cell < 0) continue;
        if (p.cell === p.row * state.cols + p.col) n++;
      }
      return n;
    }
  };
};
