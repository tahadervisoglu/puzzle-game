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
    tableTex = w > 0 && h > 0 ? buildTable(w, h) : null;
    return { w: w, h: h };
  }

  // Ahşap masa dokusu. Panel boyutu değişince bir kez üretilip saklanır;
  // her karede yeniden çizmek gereksiz olurdu.
  let tableTex = null;

  function buildTable(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    let seed = 1337;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    const base = g.createLinearGradient(0, 0, w * 0.3, h);
    base.addColorStop(0, '#6b4526');
    base.addColorStop(0.5, '#5a381e');
    base.addColorStop(1, '#472b16');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    // Damar çizgileri
    for (let i = 0; i < Math.round(h / 5) + 40; i++) {
      const y = rnd() * h;
      const alpha = 0.03 + rnd() * 0.07;
      g.strokeStyle = rnd() < 0.5
        ? 'rgba(30,18,8,' + alpha.toFixed(3) + ')'
        : 'rgba(160,115,70,' + (alpha * 0.7).toFixed(3) + ')';
      g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      g.moveTo(-10, y);
      let x = -10;
      let cy = y;
      while (x < w + 10) {
        x += 40 + rnd() * 70;
        cy += (rnd() - 0.5) * 7;
        g.lineTo(x, cy);
      }
      g.stroke();
    }

    // Budaklar
    for (let i = 0; i < 3; i++) {
      const kx = rnd() * w;
      const ky = rnd() * h;
      for (let r = 4; r < 26; r += 3.5) {
        g.strokeStyle = 'rgba(38,22,10,' + (0.12 - r * 0.003).toFixed(3) + ')';
        g.lineWidth = 1.4;
        g.beginPath();
        g.ellipse(kx, ky, r, r * 0.62, rnd() * 3, 0, Math.PI * 2);
        g.stroke();
      }
    }

    // Kenarlara doğru koyulaşan gölge, masaya derinlik verir
    const vig = g.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.2,
      w / 2, h / 2, Math.max(w, h) * 0.75
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);

    return c;
  }

  // Deprem çatlakları: ızgaranın ortasından dışa doğru yarılan hatlar
  function drawCracks(power) {
    const b = table.board.state;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const n = config.fx.crackCount;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let seed = (i + 1) * 9781;
      function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      }
      const ang = (i / n) * Math.PI * 2 + rnd() * 0.6;
      const len = (b.w + b.h) * 0.35 * (0.5 + rnd() * 0.7) * power;
      let x = cx;
      let y = cy;
      ctx.strokeStyle = 'rgba(20,12,6,' + (0.75 * power).toFixed(3) + ')';
      ctx.lineWidth = 3.2 * power;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let step = 0;
      while (step < len) {
        const seg = 14 + rnd() * 26;
        step += seg;
        x += Math.cos(ang + (rnd() - 0.5) * 0.9) * seg;
        y += Math.sin(ang + (rnd() - 0.5) * 0.9) * seg;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      // İnce açık kenar: çatlağın derinlik hissi
      ctx.strokeStyle = 'rgba(230,200,160,' + (0.28 * power).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
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

    // Dolu hücre: bırakılırsa yer değiştirecek. Boş hücreden ayrılsın diye
    // farklı renk.
    if (b.swapTarget >= 0) {
      const sx = table.board.cellX(b.swapTarget);
      const sy = table.board.cellY(b.swapTarget);
      ctx.strokeStyle = 'rgba(239,166,43,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(sx + 1, sy + 1, b.size - 2, b.size - 2);
      ctx.setLineDash([]);
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

    if (p.locked) {
      // Kalıcı parça: artık sökülemez, altın çerçeveyle belli edilir
      ctx.strokeStyle = 'rgba(239,196,90,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
    } else {
      ctx.strokeStyle = bonded ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      if (!bonded) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
      }
      // Kalıcılaşmaya yaklaşan parçanın kenarı dolmaya başlar
      if (p.lockT > 0) {
        const k = Math.min(1, p.lockT / config.lock.sec);
        ctx.strokeStyle = 'rgba(239,196,90,' + (0.85 * k).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1, 1);
        ctx.lineTo(1 + (size - 2) * k, 1);
        ctx.stroke();
      }
    }

    if (p.fake) {
      // Sahte parça hiçbir ipucu vermez; ancak Kontrol büyüsüyle görünür
      if (owner && owner.effects.kontrol > 0) {
        ctx.strokeStyle = 'rgba(226,75,74,0.95)';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
      }
    }

    ctx.restore();
  }

  // Poster büyüsü: tam resim ızgaranın tam üstüne soluk bindirilir. Parçalar
  // üstüne çizildiği için eksikler hayalet gibi görünür.
  // Referans oyun boyunca ızgaranın üstünde soluk durur; Poster büyüsü onu
  // geçici olarak belirginleştirir, Sis tamamen gizler.
  function drawGhost() {
    if (owner && owner.effects.sis > 0) return;
    const base = config.fx.ghostBase;
    const poster = owner ? (owner.effects.poster || 0) : 0;
    const boost = poster > 0
      ? (config.fx.ghostAlpha - base) * Math.min(1, poster / config.fx.ghostFadeSec)
      : 0;
    const alpha = base + boost;
    if (alpha <= 0.001) return;

    const b = table.board.state;
    ctx.save();
    ctx.globalAlpha = alpha;
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

  // Izgaradan parça çalmaya çalışan el. Kenardan uzanan bir kol ve ucunda
  // pençe; tokat yiyince titreyerek geri çekilir.
  function drawHand(h, size) {
    if (h.phase === 'idle') return;
    const r = Math.max(16, size * config.hand.radiusRatio);
    const jitter = h.recoil * 7;
    const hx = h.x + (h.recoil ? (Math.random() - 0.5) * jitter : 0);
    const hy = h.y + (h.recoil ? (Math.random() - 0.5) * jitter : 0);

    ctx.save();

    // Kol: girdiği kenardan pençeye kadar
    ctx.strokeStyle = h.recoil ? 'rgba(226,75,74,0.85)' : 'rgba(58,44,70,0.9)';
    ctx.lineWidth = r * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(h.fromX, h.fromY);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Avuç
    ctx.fillStyle = h.recoil ? '#e24b4a' : '#4a3a5e';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Parmaklar: hedefe doğru açılmış
    const ang = Math.atan2(h.toY - h.fromY, h.toX - h.fromX);
    ctx.strokeStyle = h.recoil ? '#ff8a89' : '#6b5580';
    ctx.lineWidth = r * 0.2;
    for (let i = -1; i <= 1; i++) {
      const a = ang + i * 0.55;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * r * 0.5, hy + Math.sin(a) * r * 0.5);
      ctx.lineTo(hx + Math.cos(a) * r * 1.15, hy + Math.sin(a) * r * 1.15);
      ctx.stroke();
    }

    // Tıklanabilir alanı belli et
    if (h.phase === 'uzaniyor') {
      ctx.strokeStyle = 'rgba(255,210,120,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Dondur kartı: mavi buz katmanı, kenarlarda kırağı ve "dondun" yazısı.
  // Hareket edemediğin bakar bakmaz anlaşılsın diye.
  function drawFrost(s, remaining) {
    ctx.save();
    ctx.fillStyle = 'rgba(120,190,255,0.22)';
    ctx.fillRect(0, 0, s.width, s.height);

    const grad = ctx.createRadialGradient(
      s.width / 2, s.height / 2, Math.min(s.width, s.height) * 0.25,
      s.width / 2, s.height / 2, Math.max(s.width, s.height) * 0.65
    );
    grad.addColorStop(0, 'rgba(180,225,255,0)');
    grad.addColorStop(1, 'rgba(180,225,255,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s.width, s.height);

    ctx.strokeStyle = 'rgba(215,240,255,0.75)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, s.width - 4, s.height - 4);

    if (owner.isHuman) {
      ctx.fillStyle = 'rgba(235,248,255,0.92)';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DONDUN  ' + remaining.toFixed(1) + 's', s.width / 2, s.height * 0.16);
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
      if (tableTex) ctx.drawImage(tableTex, 0, 0, s.width, s.height);

      // Sarsıntı sadece masayı oynatır; partikül ve parlama sabit katmanda
      ctx.save();
      if (fx) {
        const o = fx.offset();
        ctx.translate(o.x, o.y);
      }
      drawBoard();
      if (source) drawGhost();

      if (source) {
        for (let i = 0; i < s.order.length; i++) {
          const p = table.byId(s.order[i]);
          if (p && p.arrived) drawPiece(p, size);
        }
        if (owner && owner.effects.kontrol > 0) drawWrongMarks(size);
        if (owner && owner.effects.sarsinti > 0) {
          drawCracks(Math.min(1, owner.effects.sarsinti / config.fx.quakeSec));
        }
        if (owner && owner.hand_) drawHand(owner.hand_, size);
      }
      ctx.restore();

      if (fx) fx.draw(ctx, s.width, s.height);
      if (owner && owner.effects.karartma > 0) drawBlackout(s);
      if (owner && owner.effects.donuk > 0) drawFrost(s, owner.effects.donuk);
    }
  };
};
