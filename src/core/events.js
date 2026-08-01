window.PP = window.PP || {};

// Modüller birbirini doğrudan çağırmaz, buradan konuşur. Büyü sistemi (F3)
// bu olaylara abone olacağı için parça mantığının büyülerden haberi olmaz.
PP.EventBus = function () {
  const handlers = {};

  return {
    on: function (type, fn) {
      (handlers[type] || (handlers[type] = [])).push(fn);
      return function off() {
        const list = handlers[type];
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      };
    },
    emit: function (type, payload) {
      const list = handlers[type];
      if (!list) return;
      for (let i = 0; i < list.length; i++) list[i](payload);
    }
  };
};
