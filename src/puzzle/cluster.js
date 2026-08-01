window.PP = window.PP || {};

// Izgara dışındaki parçalar kümeler halinde durur. Tek başına duran bir parça
// da tek üyeli bir kümedir — böylece sürükleme ve bırakma tek kod yolundan gider.
//
// Küme bir çapa (x, y) tutar; üyeler çapaya göre tam sayı kafes koordinatıyla
// (gx, gy) durur. Ekran konumu buradan türetilir, o yüzden parça boyutu
// değişince kümeler kendiliğinden bozulmadan ölçeklenir.
PP.Clusters = function () {
  const state = { map: {}, nextId: 1 };

  function create(x, y) {
    const c = { id: state.nextId++, x: x, y: y, members: [] };
    state.map[c.id] = c;
    return c;
  }

  function add(c, piece, gx, gy) {
    piece.cluster = c.id;
    piece.gx = gx;
    piece.gy = gy;
    if (c.members.indexOf(piece.id) < 0) c.members.push(piece.id);
  }

  function remove(c, piece) {
    const i = c.members.indexOf(piece.id);
    if (i >= 0) c.members.splice(i, 1);
    piece.cluster = -1;
    if (c.members.length === 0) delete state.map[c.id];
  }

  return {
    state: state,
    create: create,
    add: add,
    remove: remove,
    get: function (id) { return state.map[id]; },
    all: function () {
      const out = [];
      for (const k in state.map) out.push(state.map[k]);
      return out;
    },
    clear: function () { state.map = {}; state.nextId = 1; }
  };
};
