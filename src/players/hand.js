window.PP = window.PP || {};

// Izgaradan parça çalmaya çalışan el. Belirli aralıklarla panelin bir
// kenarından uzanır ve oturmuş bir parçayı hedefler. Üstüne tıklarsan tokadı
// yiyip geri çekilir; yetişemezsen parçayı söküp masaya atar.
//
// Oyuna sürekli bir dikkat baskısı katar: yapbozla uğraşırken bir gözünüz
// hep elde olmak zorunda.
PP.Hand = function (player, config, rng) {
  const cfg = config.hand;
  const table = player.table;
  const board = player.board;

  const state = {
    phase: 'idle',      // idle | uzaniyor | cekiliyor | tokat
    t: 0,
    cooldown: cfg.intervalMs / 1000,
    x: 0, y: 0,
    fromX: 0, fromY: 0,
    toX: 0, toY: 0,
    pieceId: -1,
    recoil: 0
  };

  function radius() {
    return Math.max(16, table.state.pieceSize * cfg.radiusRatio);
  }

  // Panelin rastgele bir kenarından başlar
  function edgePoint() {
    const w = table.state.width;
    const h = table.state.height;
    const side = Math.floor(rng.next() * 4);
    if (side === 0) return { x: -40, y: rng.next() * h };
    if (side === 1) return { x: w + 40, y: rng.next() * h };
    if (side === 2) return { x: rng.next() * w, y: -40 };
    return { x: rng.next() * w, y: h + 40 };
  }

  function start() {
    const seated = table.seatedPieces();
    if (!seated.length) { state.cooldown = 1; return; }

    const id = seated[Math.floor(rng.next() * seated.length)];
    const p = table.byId(id);
    if (!p) { state.cooldown = 1; return; }

    const from = edgePoint();
    state.pieceId = id;
    state.fromX = from.x;
    state.fromY = from.y;
    state.toX = p.x + table.state.pieceSize / 2;
    state.toY = p.y + table.state.pieceSize / 2;
    state.x = from.x;
    state.y = from.y;
    state.t = 0;
    state.phase = 'uzaniyor';
  }

  // Parçayı söküp masaya atar
  function steal() {
    const p = table.byId(state.pieceId);
    if (p && p.cell >= 0) {
      const px = p.x;
      const py = p.y;
      table.park(table.liftFromBoard(p), rng);
      player.state.fx.dust(px, py, 8, 0.9);
      player.state.fx.shake(6);
      player.refreshProgress();
      player.bus.emit('el:caldi', { id: p.id });
    }
    state.pieceId = -1;
  }

  return {
    state: state,

    active: function () { return state.phase === 'uzaniyor'; },

    // İmleç elin üstünde mi
    hitTest: function (x, y) {
      if (state.phase !== 'uzaniyor') return false;
      const dx = x - state.x;
      const dy = y - state.y;
      const r = radius();
      return dx * dx + dy * dy <= r * r;
    },

    // Tokat: el vurulmuş gibi geri sıçrar
    swat: function () {
      if (state.phase !== 'uzaniyor') return false;
      state.phase = 'tokat';
      state.t = 0;
      state.recoil = 1;
      state.pieceId = -1;
      player.state.fx.shake(4);
      player.bus.emit('el:tokat', {});
      return true;
    },

    reset: function () {
      state.phase = 'idle';
      state.cooldown = cfg.intervalMs / 1000;
      state.pieceId = -1;
      state.recoil = 0;
    },

    update: function (dt) {
      if (!cfg.enabled || player.state.finished || !player.state.active) {
        if (state.phase !== 'idle') this.reset();
        return;
      }

      if (state.phase === 'idle') {
        // Donmuşken el gelmesin, tepki veremezsin
        if (player.hasEffect('donuk')) return;
        state.cooldown -= dt;
        if (state.cooldown <= 0) start();
        return;
      }

      if (state.phase === 'uzaniyor') {
        state.t += dt;
        const k = Math.min(1, state.t / cfg.reachSec);
        const e = k * k;                       // hızlanarak gelir
        state.x = state.fromX + (state.toX - state.fromX) * e;
        state.y = state.fromY + (state.toY - state.fromY) * e;
        if (k >= 1) {
          steal();
          state.phase = 'cekiliyor';
          state.t = 0;
        }
        return;
      }

      // Tokat ve çekilme: başladığı kenara geri döner
      state.t += dt;
      const dur = state.phase === 'tokat' ? cfg.retreatSec * 1.4 : cfg.retreatSec;
      const k = Math.min(1, state.t / dur);
      const e = 1 - Math.pow(1 - k, 3);
      state.x = state.toX + (state.fromX - state.toX) * e;
      state.y = state.toY + (state.fromY - state.toY) * e;
      state.recoil *= Math.pow(0.86, dt * 60);
      if (k >= 1) {
        state.phase = 'idle';
        state.recoil = 0;
        state.cooldown = cfg.intervalMs / 1000;
      }
    }
  };
};
