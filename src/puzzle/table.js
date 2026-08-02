window.PP = window.PP || {};

// Masa: parçaların konumu, kümeler, saçılma ve parça gelişi.
//
// İki ayrı yapışma var:
//   - Ortadaki ızgara hücrelerine oturma (doğru ya da yanlış, oyun söylemez)
//   - Izgara dışında parçaların birbirine yapışıp küme olması
PP.Table = function (bus, config, board, clusters) {
  const state = {
    pieces: [],
    order: [],          // z-sırası; sadece masaya gelmiş parçalar
    width: 0,
    height: 0,
    pieceSize: config.table.pieceSize,
    reserved: [],       // HUD/referans gibi üst katman panellerinin kapladığı alanlar
    slots: [],          // saçılma konumları
    slotCursor: 0,      // bir sonraki parçanın konacağı slot
    arrivals: [],       // klasik modda parçaların geliş sırası
    arrived: 0
  };

  function byId(id) {
    for (let i = 0; i < state.pieces.length; i++) {
      if (state.pieces[i].id === id) return state.pieces[i];
    }
    return null;
  }

  function overlaps(x, y, size, rect) {
    return x + size > rect.x && x < rect.x + rect.w &&
           y + size > rect.y && y < rect.y + rect.h;
  }

  // Izgara + her kenarda bir parça sığacak band, ekrana sığmalı. Sığmazsa
  // parça boyutu kısılır; yoksa band yok olur ve parçalar ızgaranın altında
  // üst üste yığılır.
  function fittedSize(requested) {
    if (!state.width || !state.height) return requested;
    const pad = config.table.padding;
    const band = 2 * (1 + config.table.boardMargin) + config.table.bandSlack;
    return Math.max(
      28,
      Math.min(
        requested,
        (state.width - pad * 2) / (config.puzzle.cols + band),
        (state.height - pad * 2) / (config.puzzle.rows + band)
      )
    );
  }

  function syncCluster(c) {
    const size = state.pieceSize;
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      if (!p) continue;
      p.x = c.x + p.gx * size;
      p.y = c.y + p.gy * size;
    }
  }

  function clampCluster(c) {
    const size = state.pieceSize;
    const slack = size * 0.25;
    let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      if (!p) continue;
      minGx = Math.min(minGx, p.gx); maxGx = Math.max(maxGx, p.gx);
      minGy = Math.min(minGy, p.gy); maxGy = Math.max(maxGy, p.gy);
    }
    if (minGx === Infinity) return;

    const loX = -slack - minGx * size;
    const hiX = state.width - size + slack - maxGx * size;
    const loY = -slack - minGy * size;
    const hiY = state.height - size + slack - maxGy * size;
    c.x = hiX < loX ? loX : Math.min(Math.max(c.x, loX), hiX);
    c.y = hiY < loY ? loY : Math.min(Math.max(c.y, loY), hiY);
  }

  function relayout() {
    state.pieceSize = fittedSize(config.table.pieceSize);
    board.layout(state.width, state.height, config.puzzle.cols, config.puzzle.rows, state.pieceSize);
    const list = clusters.all();
    for (let i = 0; i < list.length; i++) {
      clampCluster(list[i]);
      syncCluster(list[i]);
    }
    for (let i = 0; i < state.pieces.length; i++) {
      const p = state.pieces[i];
      if (p.cell >= 0) {
        p.x = board.cellX(p.cell);
        p.y = board.cellY(p.cell);
      }
    }
  }

  function boardZone() {
    const b = board.state;
    const m = state.pieceSize * config.table.boardMargin;
    return { x: b.x - m, y: b.y - m, w: b.w + m * 2, h: b.h + m * 2 };
  }

  // Bir aralığı gap adımıyla döşer ve kalan boşluğu iki uca eşit dağıtır.
  function axisPositions(min, max, gap) {
    if (max < min) return [];
    const span = max - min;
    const n = Math.floor(span / gap) + 1;
    const start = min + (span - (n - 1) * gap) / 2;
    const out = [];
    for (let i = 0; i < n; i++) out.push(start + i * gap);
    return out;
  }

  // Izgaranın dışındaki kenar bandını dört şerit olarak döşer. Tek bir tam
  // ızgara kurup ortayı elemek, dar kenarlarda şeritleri tamamen yok ediyordu.
  function buildSlots(gapRatio) {
    const size = state.pieceSize;
    const gap = size * gapRatio;
    const pad = config.table.padding;
    const zone = boardZone();
    const slots = [];

    const xMin = pad;
    const xMax = state.width - pad - size;
    const yMin = pad;
    const yMax = state.height - pad - size;

    function strip(x0, x1, y0, y1) {
      const xs = axisPositions(x0, x1, gap);
      const ys = axisPositions(y0, y1, gap);
      for (let i = 0; i < ys.length; i++) {
        for (let j = 0; j < xs.length; j++) slots.push({ x: xs[j], y: ys[i] });
      }
    }

    strip(xMin, xMax, yMin, zone.y - size);                         // üst
    strip(xMin, xMax, zone.y + zone.h, yMax);                       // alt
    // Yan şeritler sadece ızgara yüksekliği boyunca; köşeler üst/alta ait
    strip(xMin, zone.x - size, zone.y, zone.y + zone.h - size);     // sol
    strip(zone.x + zone.w, xMax, zone.y, zone.y + zone.h - size);   // sağ

    return slots.filter(function (s) {
      if (overlaps(s.x, s.y, size, zone)) return false;
      for (let i = 0; i < state.reserved.length; i++) {
        if (overlaps(s.x, s.y, size, state.reserved[i])) return false;
      }
      return true;
    });
  }

  // Parçalar başta masada değil. Klasik modda sırayla düşer, havuz modunda
  // ortak havuzdan kapıldıkça gelir. Saçılma konumları her iki modda da burada.
  // Saçılma her oyuncuda farklı (panel boyutları farklı), klasik moddaki geliş
  // sırası ise ortak olmalı — bu yüzden iki ayrı rng akışı alıyor.
  function prepare(rng, arrivalRng) {
    relayout();
    board.reset();
    clusters.clear();

    const count = state.pieces.length;
    for (let i = 0; i < count; i++) {
      const p = state.pieces[i];
      p.arrived = false;
      p.cell = -1;
      p.cluster = -1;
      p.held = false;
      p.lift = 0;
    }

    // Band dar kalırsa parçaları ızgaraya taşırmak yerine kenarda
    // sıkıştırıyoruz; gerçek bir masada da parçalar birbirine biner.
    const ratios = [config.table.scatterGap, 0.94, 0.82, 0.7, 0.58, 0.48];
    let slots = [];
    for (let i = 0; i < ratios.length; i++) {
      slots = buildSlots(ratios[i]);
      if (slots.length >= count) break;
    }
    rng.shuffle(slots);

    const size = state.pieceSize;
    const jitter = size * 0.07;
    state.slots = [];
    for (let i = 0; i < count; i++) {
      if (slots.length) {
        const slot = slots[i % slots.length];
        const layer = Math.floor(i / slots.length);
        state.slots.push({
          x: slot.x + layer * size * 0.16 + rng.range(-jitter, jitter),
          y: slot.y + layer * size * 0.16 + rng.range(-jitter, jitter)
        });
      } else {
        state.slots.push({
          x: rng.range(0, Math.max(0, state.width - size)),
          y: rng.range(0, Math.max(0, state.height - size))
        });
      }
    }

    state.order = [];
    state.slotCursor = 0;
    state.arrived = 0;
    state.arrivals = (arrivalRng || rng).shuffle(
      state.pieces.map(function (p) { return p.id; })
    );
    bus.emit('masa:hazir', { count: count, slots: slots.length });
  }

  // Çalınan parçayı sıranın başına geri koyar. Klasik modda parça bir daha
  // gelmezse oyuncu yapbozu asla bitiremezdi.
  function requeue(pieceId) {
    state.arrivals.splice(state.arrived, 0, pieceId);
  }

  // Klasik mod: sıradaki parça masaya düşer
  function dripNext() {
    if (state.arrived >= state.arrivals.length) return false;
    const id = state.arrivals[state.arrived];
    state.arrived++;
    return receive(id);
  }

  // Havuzdan kapılan parçayı masaya koyar. Zaten elindeyse reddeder.
  function receive(pieceId) {
    const p = byId(pieceId);
    if (!p || p.arrived) return false;
    const slot = state.slots[state.slotCursor % Math.max(1, state.slots.length)];
    state.slotCursor++;
    p.arrived = true;
    p.pop = 0.7;                    // masaya düşerken küçük bir sıçrama
    p.rx = 0;
    p.ry = 0;
    const c = clusters.create(slot ? slot.x : 0, slot ? slot.y : 0);
    clusters.add(c, p, 0, 0);
    clampCluster(c);
    syncCluster(c);
    state.order.push(p.id);
    bus.emit('parca:geldi', { id: p.id });
    return true;
  }

  // Parçayı masadan tamamen kaldırır (Hırsız büyüsü için)
  function removePiece(pieceId) {
    const p = byId(pieceId);
    if (!p || !p.arrived) return false;
    if (p.cell >= 0) { board.release(p.id); p.cell = -1; }
    const c = clusters.get(p.cluster);
    if (c) { clusters.remove(c, p); if (c.members.length) syncCluster(c); }
    const i = state.order.indexOf(p.id);
    if (i >= 0) state.order.splice(i, 1);
    p.arrived = false;
    p.held = false;
    p.lift = 0;
    return true;
  }

  // Masada bekleyen (ızgaraya oturmamış) parça sayısı — tepsi sınırı için
  function trayCount() {
    let n = 0;
    for (let i = 0; i < state.pieces.length; i++) {
      const p = state.pieces[i];
      if (p.arrived && p.cell < 0) n++;
    }
    return n;
  }

  function raiseCluster(c) {
    for (let i = 0; i < c.members.length; i++) {
      const idx = state.order.indexOf(c.members[i]);
      if (idx >= 0) state.order.splice(idx, 1);
    }
    for (let i = 0; i < c.members.length; i++) state.order.push(c.members[i]);
  }

  // Kümenin ızgaraya oturma planı: tüm üyeler sınır içinde ve boş hücreye
  // denk gelmeli, yoksa oturma olmaz.
  function seatPlan(c) {
    const size = state.pieceSize;
    const b = board.state;
    const tol = size * config.snap.toleranceRatio;

    let anchor = null;
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      const col = Math.round((p.x - b.x) / size);
      const row = Math.round((p.y - b.y) / size);
      const dx = b.x + col * size - p.x;
      const dy = b.y + row * size - p.y;
      const d2 = dx * dx + dy * dy;
      if (!anchor || d2 < anchor.d2) anchor = { p: p, col: col, row: row, d2: d2 };
    }
    if (!anchor || anchor.d2 > tol * tol) return null;

    const plan = [];
    const used = {};
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      const col = anchor.col + (p.gx - anchor.p.gx);
      const row = anchor.row + (p.gy - anchor.p.gy);
      if (!board.inBounds(col, row)) return null;
      const cell = row * b.cols + col;
      if (!board.isFree(cell, p.id) || used[cell]) return null;
      used[cell] = true;
      plan.push({ piece: p, cell: cell });
    }
    return plan;
  }

  // Kümeyi sıradaki saçılma slotuna atar; parça oraya uçarak gider.
  function parkAtNextSlot(c) {
    if (!state.slots.length) return;
    const before = {};
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      if (p) before[p.id] = { x: p.x, y: p.y };
    }
    const slot = state.slots[state.slotCursor % state.slots.length];
    state.slotCursor++;
    c.x = slot.x;
    c.y = slot.y;
    clampCluster(c);
    syncCluster(c);
    for (let i = 0; i < c.members.length; i++) {
      const p = byId(c.members[i]);
      const old = p && before[p.id];
      if (!old) continue;
      p.rx = old.x - p.x;
      p.ry = old.y - p.y;
    }
  }

  // Tek parçalık bir küme hangi dolu hücrenin üstünde duruyor? Yoksa -1.
  function occupiedCellUnder(c) {
    if (c.members.length !== 1) return -1;
    const p = byId(c.members[0]);
    if (!p) return -1;
    const size = state.pieceSize;
    const b = board.state;
    const col = Math.round((p.x - b.x) / size);
    const row = Math.round((p.y - b.y) / size);
    if (!board.inBounds(col, row)) return -1;
    const dx = b.x + col * size - p.x;
    const dy = b.y + row * size - p.y;
    const tol = size * config.snap.toleranceRatio;
    if (dx * dx + dy * dy > tol * tol) return -1;
    const cell = row * b.cols + col;
    const occupantId = b.cells[cell];
    if (occupantId === null || occupantId === p.id) return -1;
    return cell;
  }

  // Dolu hücreye bırakılan parça: oradaki parçayla yer değiştirir. Sürüklenen
  // parça ızgaradan geldiyse takas olur; masadan geldiyse oradaki parça masaya
  // çıkar. Eskiden bu durumda hiçbir şey olmuyordu, parça üstte asılı kalıyordu.
  function trySwap(c) {
    const cell = occupiedCellUnder(c);
    if (cell < 0) return false;

    const p = byId(c.members[0]);
    const occ = byId(board.state.cells[cell]);
    if (!occ) return false;

    const home = c.fromCell;
    const ox = occ.x;
    const oy = occ.y;

    if (home !== undefined && home >= 0 && board.isFree(home, occ.id)) {
      board.occupy(home, occ.id);
      occ.cell = home;
      occ.x = board.cellX(home);
      occ.y = board.cellY(home);
      occ.rx = ox - occ.x;          // yerine uçarak gitsin
      occ.ry = oy - occ.y;
      occ.pop = 1;
    } else {
      board.release(occ.id);
      occ.cell = -1;
      const nc = clusters.create(occ.x, occ.y);
      clusters.add(nc, occ, 0, 0);
      parkAtNextSlot(nc);
    }

    clusters.remove(c, p);
    board.occupy(cell, p.id);
    p.cell = cell;
    p.x = board.cellX(cell);
    p.y = board.cellY(cell);
    p.rx = 0;
    p.ry = 0;
    p.pop = 1;

    bus.emit('parca:oturdu', {
      count: 1,
      x: p.x + state.pieceSize / 2,
      y: p.y + state.pieceSize / 2
    });
    return true;
  }

  function seat(plan) {
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i].piece;
      const cell = plan[i].cell;
      const c = clusters.get(p.cluster);
      if (c) clusters.remove(c, p);
      board.occupy(cell, p.id);
      p.cell = cell;
      p.x = board.cellX(cell);
      p.y = board.cellY(cell);
      p.rx = 0;
      p.ry = 0;
      p.pop = 1;                       // yerine otururken kısa bir sıçrama
      cx += p.x + state.pieceSize / 2;
      cy += p.y + state.pieceSize / 2;
    }
    bus.emit('parca:oturdu', {
      count: plan.length,
      x: cx / plan.length,
      y: cy / plan.length
    });
  }

  // Izgara dışında iki kümeyi kenar kenara yapıştırır. Başarılıysa birleşmiş
  // kümeyi döndürür.
  function tryJoin(c) {
    const size = state.pieceSize;
    const tol = size * config.join.toleranceRatio;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const others = clusters.all();
    let best = null;

    for (let i = 0; i < c.members.length; i++) {
      const m = byId(c.members[i]);
      for (let j = 0; j < others.length; j++) {
        const d = others[j];
        if (d.id === c.id) continue;
        for (let k = 0; k < d.members.length; k++) {
          const n = byId(d.members[k]);
          for (let t = 0; t < dirs.length; t++) {
            const ddx = n.x + dirs[t][0] * size - m.x;
            const ddy = n.y + dirs[t][1] * size - m.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 <= tol * tol && (!best || d2 < best.d2)) {
              best = { target: d, ddx: ddx, ddy: ddy, d2: d2 };
            }
          }
        }
      }
    }
    if (!best) return null;

    const target = best.target;
    const moving = c.members.slice();
    const occupied = {};
    for (let i = 0; i < target.members.length; i++) {
      const p = byId(target.members[i]);
      occupied[p.gx + ',' + p.gy] = true;
    }

    // Yeni kafes koordinatları çakışırsa birleştirme iptal
    const placed = [];
    for (let i = 0; i < moving.length; i++) {
      const p = byId(moving[i]);
      const gx = Math.round((p.x + best.ddx - target.x) / size);
      const gy = Math.round((p.y + best.ddy - target.y) / size);
      const key = gx + ',' + gy;
      if (occupied[key]) return null;
      occupied[key] = true;
      placed.push({ piece: p, gx: gx, gy: gy });
    }

    for (let i = 0; i < placed.length; i++) {
      clusters.remove(c, placed[i].piece);
      clusters.add(target, placed[i].piece, placed[i].gx, placed[i].gy);
    }
    syncCluster(target);
    bus.emit('parca:birlesti', { cluster: target.id, added: placed.length });
    return target;
  }

  return {
    state: state,
    board: board,
    clusters: clusters,

    setPieces: function (pieces) {
      state.pieces = pieces;
      state.order = [];
    },

    setReserved: function (rects) { state.reserved = rects; },

    resize: function (w, h) {
      state.width = w;
      state.height = h;
      relayout();
    },

    relayout: relayout,
    swapCellUnder: occupiedCellUnder,
    prepare: prepare,
    receive: receive,
    dripNext: dripNext,
    requeue: requeue,
    allArrived: function () { return state.arrived >= state.arrivals.length; },
    removePiece: removePiece,
    trayCount: trayCount,

    // --- Ağ: tahtanın özeti ---
    // Oturmuş parçalar hücre numarasıyla, masadakiler oranlı konumla gider.
    // Panel boyutları her istemcide farklı olduğu için piksel göndermek işe
    // yaramaz; hücre zaten karşı tarafta doğru yerde hesaplanır.
    snapshot: function () {
      const w = state.width || 1;
      const h = state.height || 1;
      const out = [];
      for (let i = 0; i < state.pieces.length; i++) {
        const p = state.pieces[i];
        if (!p.arrived) continue;
        const c = p.cluster >= 0 ? clusters.get(p.cluster) : null;
        const seated = p.cell >= 0;
        out.push([
          p.id,
          p.cell,
          seated ? 0 : Math.round((p.x / w) * 1000) / 1000,
          seated ? 0 : Math.round((p.y / h) * 1000) / 1000,
          (c && c.members.length > 1) ? 1 : 0
        ]);
      }
      return out;
    },

    applySnapshot: function (list) {
      board.reset();
      clusters.clear();
      for (let i = 0; i < state.pieces.length; i++) {
        const p = state.pieces[i];
        p.arrived = false;
        p.cell = -1;
        p.cluster = -1;
        p.netBonded = false;
        p.held = false;
        p.lift = 0;
        p.rx = 0;
        p.ry = 0;
        p.pop = 0;
      }
      state.order = [];

      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        const p = byId(e[0]);
        if (!p) continue;
        p.arrived = true;
        p.netBonded = !!e[4];
        if (e[1] >= 0) {
          p.cell = e[1];
          board.occupy(e[1], p.id);
          p.x = board.cellX(e[1]);
          p.y = board.cellY(e[1]);
        } else {
          p.x = e[2] * state.width;
          p.y = e[3] * state.height;
        }
        state.order.push(p.id);
      }
    },

    // Izgaraya oturmuş parçaların id'leri (Deprem ve Takas için)
    seatedPieces: function () {
      const out = [];
      for (let i = 0; i < state.pieces.length; i++) {
        const p = state.pieces[i];
        if (p.cell >= 0 && !p.held) out.push(p.id);
      }
      return out;
    },

    // İki oturmuş parçanın hücrelerini değiştirir (Takas büyüsü). Tahta dolu
    // görünmeye devam eder, oyuncu neyin bozulduğunu bilmez.
    swapCells: function (idA, idB) {
      const a = byId(idA);
      const b = byId(idB);
      if (!a || !b || a.cell < 0 || b.cell < 0) return false;
      const ca = a.cell;
      const cb = b.cell;
      board.occupy(ca, b.id);
      board.occupy(cb, a.id);
      a.cell = cb;
      b.cell = ca;
      a.x = board.cellX(cb); a.y = board.cellY(cb);
      b.x = board.cellX(ca); b.y = board.cellY(ca);
      return true;
    },

    // Masadaki tüm tek parçaları tek bir yığına yapıştırır (Yapıştır büyüsü).
    // Oyuncu bunu sağ tıkla tek tek koparmak zorunda kalır.
    clumpLoose: function () {
      const loose = [];
      const list = clusters.all();
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const first = byId(c.members[0]);
        if (!first || first.held) continue;
        for (let j = 0; j < c.members.length; j++) loose.push(byId(c.members[j]));
      }
      if (loose.length < 2) return 0;

      const base = clusters.get(loose[0].cluster);
      const anchor = { x: base.x, y: base.y };
      const wide = Math.ceil(Math.sqrt(loose.length));
      const target = clusters.create(anchor.x, anchor.y);
      for (let i = 0; i < loose.length; i++) {
        const p = loose[i];
        const old = clusters.get(p.cluster);
        if (old) clusters.remove(old, p);
        clusters.add(target, p, i % wide, Math.floor(i / wide));
      }
      clampCluster(target);
      syncCluster(target);
      return loose.length;
    },

    // Masada bekleyen parçaların id'leri
    loosePieces: function () {
      const out = [];
      for (let i = 0; i < state.pieces.length; i++) {
        const p = state.pieces[i];
        if (p.arrived && p.cell < 0 && !p.held) out.push(p.id);
      }
      return out;
    },
    byId: byId,
    syncCluster: syncCluster,
    clampCluster: clampCluster,
    raiseCluster: raiseCluster,
    seatPlan: seatPlan,

    // Oyuncunun bu parçası masada ya da ızgarada mı
    has: function (pieceId) {
      const p = byId(pieceId);
      return !!(p && p.arrived);
    },

    // Üstteki parçadan başlayarak isabet testi
    pick: function (x, y) {
      const size = state.pieceSize;
      for (let i = state.order.length - 1; i >= 0; i--) {
        const p = byId(state.order[i]);
        if (!p || !p.arrived) continue;
        if (x >= p.x && x <= p.x + size && y >= p.y && y <= p.y + size) return p;
      }
      return null;
    },

    // Izgaradaki parçayı söküp tek üyeli kümeye çevirir. Geldiği hücre
    // saklanır ki dolu bir hücreye bırakılırsa takas yapılabilsin.
    liftFromBoard: function (p) {
      const from = p.cell;
      board.release(p.id);
      p.cell = -1;
      const c = clusters.create(p.x, p.y);
      clusters.add(c, p, 0, 0);
      c.fromCell = from;
      return c;
    },

    // Sağ tık: parçayı kümesinden koparır
    detach: function (p) {
      const c = clusters.get(p.cluster);
      if (!c) return null;
      if (c.members.length <= 1) return c;
      clusters.remove(c, p);
      const nc = clusters.create(p.x, p.y);
      clusters.add(nc, p, 0, 0);
      bus.emit('parca:koparildi', { id: p.id });
      return nc;
    },

    clusterOf: function (p) { return clusters.get(p.cluster); },

    // Kümeyi kenardaki saçılma konumlarından birine taşır. Parçalar yeni
    // yerlerine ışınlanmasın diye eski konumları çizim kayması olarak
    // saklanır; oyun mantığı anında taşınmış sayar, göz uçuşu görür.
    park: function (c, rng) {
      if (!state.slots.length) return;
      const before = {};
      for (let i = 0; i < c.members.length; i++) {
        const p = byId(c.members[i]);
        if (p) before[p.id] = { x: p.x, y: p.y };
      }
      const s = state.slots[Math.floor(rng.next() * state.slots.length)];
      c.x = s.x;
      c.y = s.y;
      clampCluster(c);
      syncCluster(c);
      for (let i = 0; i < c.members.length; i++) {
        const p = byId(c.members[i]);
        const old = p && before[p.id];
        if (!old) continue;
        p.rx = old.x - p.x;
        p.ry = old.y - p.y;
      }
    },

    // Bırakma: önce ızgaraya oturmayı dener, olmazsa komşu kümeye yapışır.
    // allowJoin, parça gerçekten sürüklendiyse true gelir — yerinde tıklamak
    // parçayı yanındaki komşuya kazara yapıştırmasın diye.
    drop: function (c, allowJoin) {
      const plan = seatPlan(c);
      if (plan) {
        seat(plan);
        return 'board';
      }
      // Hedef hücre doluysa yer değiştir
      if (trySwap(c)) return 'swap';
      if (!allowJoin) return 'free';
      let cur = c;
      let merged = false;
      for (let i = 0; i < config.join.maxCascade; i++) {
        const next = tryJoin(cur);
        if (!next) break;
        cur = next;
        merged = true;
      }
      return merged ? 'join' : 'free';
    },

    update: function (dt) {
      const speed = config.feel.liftSpeed;
      const fly = Math.pow(config.fx.flyDecay, dt * 60);
      const pop = Math.pow(config.fx.popDecay, dt * 60);
      for (let i = 0; i < state.pieces.length; i++) {
        const p = state.pieces[i];
        const target = p.held ? 1 : 0;
        p.lift += (target - p.lift) * Math.min(1, speed * dt * 60);
        if (Math.abs(p.lift - target) < 0.001) p.lift = target;

        if (p.rx || p.ry) {
          p.rx *= fly;
          p.ry *= fly;
          if (Math.abs(p.rx) < 0.4 && Math.abs(p.ry) < 0.4) { p.rx = 0; p.ry = 0; }
        }
        if (p.pop) {
          p.pop *= pop;
          if (p.pop < 0.01) p.pop = 0;
        }
      }
    }
  };
};
