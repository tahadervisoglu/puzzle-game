window.PP = window.PP || {};

// Seeded RNG (mulberry32). Parça sırası, saçılma ve bot kararları buradan
// beslenir; aynı seed her oyuncuda aynı oyunu üretir.
PP.Rng = function (seed) {
  let s = seed >>> 0;

  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next: next,
    range: function (min, max) { return min + next() * (max - min); },
    int: function (min, max) { return Math.floor(min + next() * (max - min + 1)); },
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle: function (arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
  };
};
