window.PP = window.PP || {};

// Bir oyuncunun kendi masası, ızgarası, kümeleri ve paneli. İnsan da bot da
// aynı Player'ı kullanır — aradaki tek fark onu süren denetleyicidir.
PP.Player = function (opts) {
  const config = opts.config;
  const bus = PP.EventBus();
  const board = PP.Board();
  const clusters = PP.Clusters();
  const table = PP.Table(bus, config, board, clusters);
  const canvas = opts.canvas;

  const state = {
    id: opts.id,
    name: opts.name,
    isHuman: !!opts.isHuman,
    seat: opts.id,       // ağ oyununda koltuk numarası; panelden bağımsız
    remote: false,       // uzaktaki gerçek oyuncu — yerel simülasyon çalışmaz
    owned: true,         // bu makinede simüle ediliyor mu (büyü etkileri buna bakar)
    dropped: false,      // bağlantısı koptu — tahtası donar, hedeflenmez
    dripAcc: 0,          // klasik mod
    claimCooldown: 0,    // havuz modu
    blockedUntil: 0,     // Kilit büyüsü: havuzdan kapmak engellenir
    elapsed: 0,
    finished: false,
    finishedAt: 0,
    rank: 0,
    seated: 0,
    correct: 0,
    // Büyü sistemi (F3)
    effects: {},          // buyuId -> kalan saniye
    pendingOffer: null,   // seçim bekleyen kart çifti (seçilince hemen uygulanır)
    owed: 0,              // hak edilmiş ama henüz sunulmamış kart
    nextThreshold: 0,
    warning: null,        // { text, remaining }
    pointer: { x: 0, y: 0 },
    fx: PP.Fx(config)
  };

  // Parça ızgaraya oturunca parçanın kendi konumunda halka + toz
  bus.on('parca:oturdu', function (info) {
    const x = info && info.x !== undefined ? info.x : table.state.width / 2;
    const y = info && info.y !== undefined ? info.y : board.state.y + board.state.h;
    state.fx.ring(x, y, table.state.pieceSize);
    state.fx.dust(x, y + table.state.pieceSize * 0.4, 5, 0.55);
    state.fx.shake(2.5);
    if (opts.audio && state.isHuman) opts.audio.play('otur');
  });

  bus.on('parca:birlesti', function () {
    if (opts.audio && state.isHuman) opts.audio.play('birles');
  });

  bus.on('parca:geldi', function () {
    if (opts.audio && state.isHuman) opts.audio.play('parca');
  });

  const renderer = PP.Renderer(canvas, table, config, state);

  function collectReserved() {
    if (!opts.overlayIds || !opts.overlayIds.length) return;
    const base = canvas.getBoundingClientRect();
    const margin = 8;
    const rects = [];
    for (let i = 0; i < opts.overlayIds.length; i++) {
      const el = document.getElementById(opts.overlayIds[i]);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      rects.push({
        x: r.left - base.left - margin,
        y: r.top - base.top - margin,
        w: r.width + margin * 2,
        h: r.height + margin * 2
      });
    }
    table.setReserved(rects);
  }

  function refreshProgress() {
    const pieces = table.state.pieces;
    let seated = 0;
    for (let i = 0; i < pieces.length; i++) if (pieces[i].cell >= 0) seated++;
    state.seated = seated;
    state.correct = board.correctCount(pieces);
    return state.correct === pieces.length && pieces.length > 0;
  }

  return {
    state: state,
    bus: bus,
    table: table,
    board: board,
    clusters: clusters,
    canvas: canvas,

    setSource: function (source) { renderer.setSource(source); },

    resize: function () {
      const size = renderer.resize();
      table.resize(size.w, size.h);
      collectReserved();
    },

    setPieces: function (pieces) { table.setPieces(pieces); },

    restart: function (scatterRng, arrivalRng) {
      state.claimCooldown = 0;
      state.blockedUntil = 0;
      state.dripAcc = 0;
      state.elapsed = 0;
      state.finished = false;
      state.finishedAt = 0;
      state.rank = 0;
      state.fx.clear();
      collectReserved();
      table.prepare(scatterRng, arrivalRng);
      if (config.mode === 'klasik') {
        for (let i = 0; i < config.drip.initial; i++) table.dripNext();
      }
      refreshProgress();
    },

    // Havuzdan parça kapma. Tepsi doluysa ya da parça zaten elindeyse olmaz.
    canClaim: function (pieceId) {
      if (state.finished) return false;
      if (state.claimCooldown > 0 || state.blockedUntil > 0) return false;
      if (table.trayCount() >= config.pool.trayLimit) return false;
      if (pieceId !== undefined && table.has(pieceId)) return false;
      return true;
    },

    claim: function (pieceId) {
      if (!table.receive(pieceId)) return false;
      state.claimCooldown = config.pool.claimCooldownMs / 1000;
      refreshProgress();
      return true;
    },

    addEffect: function (id, seconds) {
      state.effects[id] = Math.max(state.effects[id] || 0, seconds);
    },

    hasEffect: function (id) { return (state.effects[id] || 0) > 0; },

    // Tamamlandıysa true döner; sıralamayı çağıran belirler.
    update: function (dt) {
      table.update(dt);
      state.fx.update(dt);

      for (const id in state.effects) {
        state.effects[id] -= dt;
        if (state.effects[id] <= 0) delete state.effects[id];
      }
      if (state.warning) {
        state.warning.remaining -= dt;
        if (state.warning.remaining <= 0) state.warning = null;
      }

      if (state.finished) return false;
      state.elapsed += dt;
      if (state.claimCooldown > 0) state.claimCooldown -= dt;
      if (state.blockedUntil > 0) state.blockedUntil -= dt;

      // Uzaktaki oyuncunun tahtası ağdan gelir, burada simüle edilmez
      if (state.remote) return false;

      // Klasik modda parçalar kendiliğinden düşer; Kilit büyüsü akışı durdurur
      if (config.mode === 'klasik' && state.blockedUntil <= 0 && !table.allArrived()) {
        state.dripAcc += dt * 1000;
        while (state.dripAcc >= config.drip.intervalMs && !table.allArrived()) {
          state.dripAcc -= config.drip.intervalMs;
          table.dripNext();
        }
      }
      return refreshProgress();
    },

    refreshProgress: refreshProgress,
    draw: function () { renderer.draw(); },
    trayCount: function () { return table.trayCount(); },

    nextPieceIn: function () {
      if (table.allArrived()) return -1;
      return Math.max(0, config.drip.intervalMs - state.dripAcc) / 1000;
    }
  };
};
