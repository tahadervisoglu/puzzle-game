window.PP = window.PP || {};

// İnsan denetleyicisi: girdi niyetlerini kendi oyuncusunun masasına uygular.
PP.Human = function (player, config) {
  const canvas = player.canvas;
  const table = player.table;
  const board = player.board;
  const clusters = player.clusters;
  const bus = player.bus;
  const input = PP.Input(canvas, bus);

  function clearTargets() {
    board.state.targets = [];
    board.state.swapTarget = -1;
  }

  function refreshTargets() {
    const held = input.held;
    if (!held) { clearTargets(); return; }
    const c = clusters.get(held.clusterId);
    if (!c) { clearTargets(); return; }
    const plan = table.seatPlan(c);
    board.state.targets = plan ? plan.map(function (e) { return e.cell; }) : [];
    // Boş hücreye oturmuyorsa dolu hücreyle yer değiştirecek mi
    board.state.swapTarget = plan ? -1 : table.swapCellUnder(c);
  }

  function setHeld(c, value) {
    for (let i = 0; i < c.members.length; i++) {
      const p = table.byId(c.members[i]);
      if (p) p.held = value;
    }
  }

  bus.on('niyet:tut', function (pt) {
    if (player.state.finished || player.hasEffect('donuk')) return;
    const p = table.pick(pt.x, pt.y);
    if (!p) return;

    let c;
    if (p.cell >= 0) {
      c = table.liftFromBoard(p);
    } else if (pt.detach) {
      c = table.detach(p);
    } else {
      c = table.clusterOf(p);
    }
    if (!c) return;

    table.raiseCluster(c);
    setHeld(c, true);
    input.held = {
      clusterId: c.id,
      dx: pt.x - c.x,
      dy: pt.y - c.y,
      startX: pt.x,
      startY: pt.y,
      moved: false
    };
    canvas.classList.add('grabbing');
    refreshTargets();
    player.refreshProgress();
  });

  bus.on('niyet:tasi', function (pt) {
    const held = input.held;
    if (!held) return;
    const c = clusters.get(held.clusterId);
    if (!c) return;
    c.x = pt.x - held.dx;
    c.y = pt.y - held.dy;
    if (!held.moved) {
      const dx = pt.x - held.startX;
      const dy = pt.y - held.startY;
      if (dx * dx + dy * dy > 16) held.moved = true;
    }
    table.clampCluster(c);
    table.syncCluster(c);
    refreshTargets();
  });

  bus.on('niyet:birak', function () {
    const held = input.held;
    if (!held) return;
    const c = clusters.get(held.clusterId);
    input.held = null;
    clearTargets();
    canvas.classList.remove('grabbing');
    if (c) {
      setHeld(c, false);
      table.drop(c, held.moved);
    }
    player.refreshProgress();
  });

  return {
    input: input,

    // İmleç bir parçanın üzerindeyse tutulabilir işareti
    updateCursor: function () {
      // Karartma büyüsündeki fener imleci takip eder
      player.state.pointer.x = input.pointer.x;
      player.state.pointer.y = input.pointer.y;
      if (input.held) return;
      const over = table.pick(input.pointer.x, input.pointer.y);
      canvas.classList.toggle('grabbable', !!over);
    },

    release: function () {
      if (!input.held) return;
      const c = clusters.get(input.held.clusterId);
      if (c) setHeld(c, false);
      input.held = null;
      clearTargets();
      canvas.classList.remove('grabbing');
    }
  };
};
