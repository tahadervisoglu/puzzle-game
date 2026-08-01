window.PP = window.PP || {};

// Ortak havuzun çizimi ve tıklama isabeti. Havuz kimseye ait olmadığı için
// kendi canvas'ında, panellerin dışında yaşar.
PP.PoolView = function (canvas, pool, config, human) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let source = null;
  let template = [];      // parça id -> kaynak dikdörtgeni
  let layout = { size: 0, x0: 0, y: 0, gap: 0 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = config.pool.capacity;
    const pad = 14;
    const gap = 8;
    const size = Math.max(
      24,
      Math.min(h - pad * 2, (w - pad * 2 - gap * (n - 1)) / n)
    );
    const totalW = size * n + gap * (n - 1);
    layout = { size: size, x0: (w - totalW) / 2, y: (h - size) / 2, gap: gap };
    return { w: w, h: h };
  }

  function slotRect(i) {
    return {
      x: layout.x0 + i * (layout.size + layout.gap),
      y: layout.y,
      s: layout.size
    };
  }

  return {
    resize: resize,
    setSource: function (src, tpl) { source = src; template = tpl; },

    // Tıklanan slot; boşsa -1
    hit: function (x, y) {
      for (let i = 0; i < pool.state.slots.length; i++) {
        if (pool.state.slots[i] === null) continue;
        const r = slotRect(i);
        if (x >= r.x && x <= r.x + r.s && y >= r.y && y <= r.y + r.s) return i;
      }
      return -1;
    },

    draw: function () {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      if (!source) return;

      const trayFull = human.trayCount() >= config.pool.trayLimit;
      const blocked = human.state.blockedUntil > 0;

      for (let i = 0; i < pool.state.slots.length; i++) {
        const r = slotRect(i);
        const id = pool.state.slots[i];

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(r.x, r.y, r.s, r.s);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.s - 1, r.s - 1);
        if (id === null) continue;

        const t = template[id];
        ctx.drawImage(source, t.sx, t.sy, t.sw, t.sh, r.x, r.y, r.s, r.s);

        // Elinde olan, tepsisi dolu olan ya da kilitli oyuncuya sönük görünür
        const owned = human.table.has(id);
        if (owned || trayFull || blocked) {
          ctx.fillStyle = 'rgba(10,12,18,0.66)';
          ctx.fillRect(r.x, r.y, r.s, r.s);
        }
        ctx.strokeStyle = owned ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)';
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.s - 1, r.s - 1);
      }
    }
  };
};
