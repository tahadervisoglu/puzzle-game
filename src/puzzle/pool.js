window.PP = window.PP || {};

// Ortak parça havuzu. Parçalar kimseye ait değil: ortaya düşer, dört oyuncu da
// aynı havuzdan kapar. Oyunun rekabeti büyülerden önce burada başlar.
//
// Torba mantığı: 15 parçanın tamamı karılır, biter bitmez yeniden karılır.
// Böylece hiçbir parça uzun süre ortadan kaybolmaz ama sıra rastgele kalır.
PP.Pool = function (config, rng) {
  const state = {
    slots: [],       // her slot: parça id'si ya da null
    bag: [],
    dripAcc: 0,
    total: 0
  };

  function refillBag() {
    state.bag = [];
    for (let i = 0; i < state.total; i++) state.bag.push(i);
    rng.shuffle(state.bag);
  }

  function freeSlot() {
    for (let i = 0; i < state.slots.length; i++) if (state.slots[i] === null) return i;
    return -1;
  }

  function drop() {
    const slot = freeSlot();
    if (slot < 0) return -1;
    if (!state.bag.length) refillBag();
    const id = state.bag.pop();
    state.slots[slot] = id;
    return slot;
  }

  return {
    state: state,

    reset: function (totalPieces) {
      state.total = totalPieces;
      state.slots = [];
      for (let i = 0; i < config.pool.capacity; i++) state.slots.push(null);
      state.dripAcc = 0;
      refillBag();
      for (let i = 0; i < config.pool.initial; i++) drop();
    },

    update: function (dt) {
      state.dripAcc += dt * 1000;
      while (state.dripAcc >= config.pool.intervalMs) {
        state.dripAcc -= config.pool.intervalMs;
        if (drop() < 0) state.dripAcc = 0;   // havuz doluysa akış bekler
      }
    },

    // Slotu boşaltıp parça id'sini döndürür
    take: function (slot) {
      const id = state.slots[slot];
      if (id === undefined || id === null) return -1;
      state.slots[slot] = null;
      return id;
    },

    // Parçayı havuza geri koyar (Hırsız'ın işe yaramayan çalıntısı)
    give: function (id) {
      const slot = freeSlot();
      if (slot < 0) return false;
      state.slots[slot] = id;
      return true;
    },

    // Verilen parçalardan havuzda duran ilk slotu bulur (bot ve büyüler için)
    findSlot: function (predicate) {
      for (let i = 0; i < state.slots.length; i++) {
        const id = state.slots[i];
        if (id === null) continue;
        if (predicate(id)) return i;
      }
      return -1;
    },

    count: function () {
      let n = 0;
      for (let i = 0; i < state.slots.length; i++) if (state.slots[i] !== null) n++;
      return n;
    },

    nextIn: function () {
      return Math.max(0, config.pool.intervalMs - state.dripAcc) / 1000;
    }
  };
};
