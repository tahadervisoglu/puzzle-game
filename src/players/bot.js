window.PP = window.PP || {};

// Bot, insanla aynı Player üzerinde çalışır: parçayı tutar, sürükler, bırakır.
// Zorluk iki sayıyla ayarlanır — düşünme süresi ve hata oranı.
PP.Bot = function (player, rng, cfg, skills, pool, gamble) {
  const table = player.table;
  const board = player.board;
  const clusters = player.clusters;

  let cooldown = cfg.thinkMs;
  let drag = null;
  let pickDelay = -1;
  let claimTimer = cfg.claimMs;

  // Sis ve Karartma botu da vurur: resmi göremeyince daha çok hata yapar ve
  // yavaşlar. Yoksa karanlık büyüler botlara karşı anlamsız kalırdı.
  function penalty() {
    let err = cfg.errorRate;
    let slow = 1;
    if (player.hasEffect('sis')) { err *= 3; slow *= 1.3; }
    if (player.hasEffect('karartma')) { err *= 2.5; slow *= 1.6; }
    return { err: Math.min(0.85, err), slow: slow };
  }

  function emptyCells() {
    const cells = board.state.cells;
    const out = [];
    for (let i = 0; i < cells.length; i++) if (cells[i] === null) out.push(i);
    return out;
  }

  function correctCellOf(p) {
    return p.row * board.state.cols + p.col;
  }

  // Izgaradaki parçayı söküp masaya geri atar. Kalıcı parça sökülmez.
  function evict(p) {
    if (!p || p.locked) return null;
    const c = table.liftFromBoard(p);
    table.park(c, rng);
    return c;
  }

  function setHeld(c, value) {
    for (let i = 0; i < c.members.length; i++) {
      const m = table.byId(c.members[i]);
      if (m) m.held = value;
    }
  }

  function beginDrag(piece, cell) {
    const c = clusters.get(piece.cluster);
    if (!c) return false;
    table.raiseCluster(c);
    setHeld(c, true);
    drag = {
      clusterId: c.id,
      cell: cell,
      fromX: c.x,
      fromY: c.y,
      toX: board.cellX(cell) - piece.gx * table.state.pieceSize,
      toY: board.cellY(cell) - piece.gy * table.state.pieceSize,
      t: 0,
      dur: Math.max(60, cfg.dragMs)
    };
    return true;
  }

  function choose() {
    const pieces = table.state.pieces;
    const free = [];
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].arrived && pieces[i].cell < 0) free.push(pieces[i]);
    }

    let piece = null;
    let cell = -1;

    if (free.length) {
      piece = free[Math.floor(rng.next() * free.length)];
      const correct = correctCellOf(piece);
      if (rng.next() < penalty().err) {
        const empties = emptyCells();
        if (empties.length) cell = empties[Math.floor(rng.next() * empties.length)];
      } else if (board.isFree(correct, piece.id)) {
        cell = correct;
      } else {
        // Doğru hücrede yanlış parça var: önce onu çıkar
        const occ = table.byId(board.state.cells[correct]);
        if (occ && evict(occ)) cell = correct;
      }
      if (cell < 0) {
        const empties = emptyCells();
        if (empties.length) cell = empties[Math.floor(rng.next() * empties.length)];
      }
    } else {
      // Masada parça kalmadı; yanlış oturmuş birini düzelt
      const wrong = [];
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (p.cell >= 0 && p.cell !== correctCellOf(p)) wrong.push(p);
      }
      if (!wrong.length) return false;
      piece = wrong[Math.floor(rng.next() * wrong.length)];
      evict(piece);
      const correct = correctCellOf(piece);
      if (board.isFree(correct, piece.id)) {
        cell = correct;
      } else {
        const occ = table.byId(board.state.cells[correct]);
        if (occ && evict(occ)) cell = correct;
      }
    }

    if (!piece || cell < 0) return false;
    return beginDrag(piece, cell);
  }

  function rand(range) { return range[0] + rng.next() * (range[1] - range[0]); }

  // Bot da ele tepki verir; bazen ıskalar, zorluk tepki süresinden gelir
  let handTimer = -1;
  let handMissed = false;
  function handleHand(dt) {
    const h = player.hand;
    if (!h.active()) { handTimer = -1; handMissed = false; return; }
    if (handMissed) return;
    if (handTimer < 0) {
      if (rng.next() < PP.config.hand.botMiss) { handMissed = true; return; }
      handTimer = rand(PP.config.hand.botReaction) * penalty().slow;
    }
    handTimer -= dt;
    if (handTimer <= 0) { h.swat(); handTimer = -1; }
  }

  // Kumar kartları: bot da elinde biriktirir, arada bir rastgele oynar
  let gambleDelay = -1;
  function handleGamble(dt) {
    const hand = player.state.hand;
    if (!hand || !hand.length) { gambleDelay = -1; return; }
    if (gambleDelay < 0) gambleDelay = rand(PP.config.gamble.botPlayDelay);
    gambleDelay -= dt;
    if (gambleDelay > 0) return;
    gamble.play(player, Math.floor(rng.next() * hand.length));
    gambleDelay = -1;
  }

  // Ortak havuzdan parça kapma. Tepki süresi zorluğun bir parçası — yavaş bot
  // istediği parçayı hızlı olana kaptırır.
  function handleClaim(dt) {
    claimTimer -= dt * 1000 / penalty().slow;
    if (claimTimer > 0) return;
    claimTimer = cfg.claimMs * (0.7 + rng.next() * 0.6);
    if (!player.canClaim()) return;
    const slot = pool.findSlot(function (id) { return !table.has(id); });
    if (slot < 0) return;
    const id = pool.take(slot);
    if (id >= 0) player.claim(id);
  }

  // Kart seçimi: geride kaldıysa saldırıya, öndeyse kendi faydasına yönelir.
  // Seçim anında uygulanır, cepte bekletme yok.
  function handleSkills(dt, skillCfg) {
    const st = player.state;
    if (!st.pendingOffer) { pickDelay = -1; return; }

    if (pickDelay < 0) pickDelay = rand(skillCfg.botPickDelay);
    pickDelay -= dt;
    if (pickDelay > 0) return;

    const rival = skills.pickTarget(player);
    const behind = rival && rival.state.correct > st.correct;
    const wantDark = behind ? rng.next() < 0.75 : rng.next() < 0.35;
    skills.choose(player, wantDark ? 'dark' : 'light');
    pickDelay = -1;
  }

  return {
    update: function (dt, skillCfg) {
      if (player.state.finished || player.hasEffect('donuk')) return;
      if (gamble) handleGamble(dt);
      handleHand(dt);
      if (pool && PP.config.mode === 'havuz') handleClaim(dt);
      if (skills && skillCfg) handleSkills(dt, skillCfg);

      if (drag) {
        const c = clusters.get(drag.clusterId);
        if (!c) { drag = null; return; }
        drag.t += dt * 1000;
        const k = Math.min(1, drag.t / drag.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        c.x = drag.fromX + (drag.toX - drag.fromX) * e;
        c.y = drag.fromY + (drag.toY - drag.fromY) * e;
        table.syncCluster(c);
        if (k >= 1) {
          setHeld(c, false);
          table.drop(c, false);
          player.refreshProgress();
          cooldown = (cfg.thinkMs + rng.next() * cfg.jitterMs) * penalty().slow;
          drag = null;
        }
        return;
      }

      cooldown -= dt * 1000;
      if (cooldown <= 0) {
        if (!choose()) cooldown = 400;
      }
    },

    reset: function () {
      drag = null;
      cooldown = cfg.thinkMs;
      pickDelay = -1;
      claimTimer = cfg.claimMs;
    }
  };
};
