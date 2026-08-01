window.PP = window.PP || {};

// Çizim katmanı simülasyona hiçbir şey yazmaz, sadece okur.
PP.Renderer = function (canvas, table, config, owner) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let source = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  function drawBoard() {
    const b = table.board.state;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    for (let c = 1; c < b.cols; c++) {
      const x = Math.round(b.x + c * b.size) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, b.y);
      ctx.lineTo(x, b.y + b.h);
      ctx.stroke();
    }
    for (let r = 1; r < b.rows; r++) {
      const y = Math.round(b.y + r * b.size) + 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + b.w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, b.w, b.h);

    for (let i = 0; i < b.targets.length; i++) {
      const tx = table.board.cellX(b.targets[i]);
      const ty = table.board.cellY(b.targets[i]);
      ctx.fillStyle = 'rgba(125,116,220,0.22)';
      ctx.fillRect(tx, ty, b.size, b.size);
      ctx.strokeStyle = 'rgba(160,150,255,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx + 1, ty + 1, b.size - 2, b.size - 2);
    }
    ctx.restore();
  }

  function drawPiece(p, size) {
    // pop: yerleşirken şişip sönme · rx/ry: savrulduktan sonra yerine uçma
    const scale = 1 + p.lift * config.feel.liftScale + p.pop * config.fx.popScale;
    const cx = p.x + p.rx + size / 2;
    const cy = p.y + p.ry + size / 2;

    ctx.save();
    if (p.lift > 0.01) {
      ctx.shadowColor = 'rgba(0,0,0,' + (0.45 * p.lift).toFixed(3) + ')';
      ctx.shadowBlur = config.feel.shadowBlur * p.lift;
      ctx.shadowOffsetY = 6 * p.lift;
    }
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-size / 2, -size / 2);

    ctx.drawImage(source, p.sx, p.sy, p.sw, p.sh, 0, 0, size, size);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Yapışmış parçalarda kenar çizgisi zayıflar; birleşen alan tek resim
    // gibi okunsun diye.
    const cluster = p.cluster >= 0 ? table.clusters.get(p.cluster) : null;
    const bonded = p.cell >= 0 || p.netBonded || (cluster && cluster.members.length > 1);
    ctx.strokeStyle = bonded ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    if (!bonded) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
    }

    ctx.restore();
  }

  // Poster büyüsü: tam resim ızgaranın tam üstüne soluk bindirilir. Parçalar
  // üstüne çizildiği için eksikler hayalet gibi görünür.
  function drawGhost() {
    const b = table.board.state;
    ctx.save();
    ctx.globalAlpha = config.fx.ghostAlpha;
    ctx.drawImage(source, 0, 0, source.width, source.height, b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  // Kontrol büyüsü: yanlış hücreye oturmuş parçaları yakar. Sadece bu büyü
  // aktifken görünür — normalde oyun yanlışı hiç belli etmez.
  function drawWrongMarks(size) {
    const cols = table.board.state.cols;
    const pieces = table.state.pieces;
    ctx.save();
    ctx.strokeStyle = 'rgba(226,75,74,0.95)';
    ctx.fillStyle = 'rgba(226,75,74,0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.cell < 0 || p.cell === p.row * cols + p.col) continue;
      ctx.fillRect(p.x + p.rx, p.y + p.ry, size, size);
      ctx.strokeRect(p.x + p.rx + 1, p.y + p.ry + 1, size - 2, size - 2);
    }
    ctx.restore();
  }

  // Karartma büyüsü: insan oyuncuda imleç çevresi fener gibi açık kalır,
  // botlarda panel tümden kararır.
  function drawBlackout(s) {
    ctx.save();
    if (owner.isHuman) {
      const r = Math.max(70, s.pieceSize * 2.2);
      const g = ctx.createRadialGradient(
        owner.pointer.x, owner.pointer.y, r * 0.35,
        owner.pointer.x, owner.pointer.y, r
      );
      g.addColorStop(0, 'rgba(6,8,14,0)');
      g.addColorStop(1, 'rgba(6,8,14,0.94)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s.width, s.height);
      ctx.fillStyle = 'rgba(6,8,14,0.94)';
      ctx.beginPath();
      ctx.rect(0, 0, s.width, s.height);
      ctx.arc(owner.pointer.x, owner.pointer.y, r, 0, Math.PI * 2);
      ctx.fill('evenodd');
    } else {
      ctx.fillStyle = 'rgba(6,8,14,0.88)';
      ctx.fillRect(0, 0, s.width, s.height);
    }
    ctx.restore();
  }

  return {
    resize: resize,
    setSource: function (canvasSource) { source = canvasSource; },

    draw: function () {
      const s = table.state;
      const size = s.pieceSize;
      const fx = owner && owner.fx;

      ctx.clearRect(0, 0, s.width, s.height);

      // Sarsıntı sadece masayı oynatır; partikül ve parlama sabit katmanda
      ctx.save();
      if (fx) {
        const o = fx.offset();
        ctx.translate(o.x, o.y);
      }
      drawBoard();
      if (source && owner && owner.effects.poster > 0) drawGhost();

      if (source) {
        for (let i = 0; i < s.order.length; i++) {
          const p = table.byId(s.order[i]);
          if (p && p.arrived) drawPiece(p, size);
        }
        if (owner && owner.effects.kontrol > 0) drawWrongMarks(size);
      }
      ctx.restore();

      if (fx) fx.draw(ctx, s.width, s.height);
      if (owner && owner.effects.karartma > 0) drawBlackout(s);
    }
  };
};
