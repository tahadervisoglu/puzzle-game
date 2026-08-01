window.PP = window.PP || {};

// Prosedürel yer tutucu resim. Harici dosya yok: file:// altında canvas'ın
// tainted olmaması ve kurulum gerekmemesi için resim koda çiziliyor.
// Gerçek bir görsel seti gelince burası PP.artwork.fromImage ile değişir.
PP.artwork = {
  create: function (w, h, rng) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    const horizon = h * 0.58;

    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#16255a');
    sky.addColorStop(0.42, '#4a3a7d');
    sky.addColorStop(0.72, '#b5567a');
    sky.addColorStop(1, '#f0a05a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, horizon);

    for (let i = 0; i < 90; i++) {
      const sx = rng.range(0, w);
      const sy = rng.range(0, horizon * 0.55);
      const r = rng.range(0.6, 2.1);
      g.globalAlpha = rng.range(0.25, 0.9) * (1 - sy / (horizon * 0.7));
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(sx, sy, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    const sunX = w * rng.range(0.24, 0.74);
    const sunY = horizon - h * 0.055;
    const sunR = h * 0.075;

    const glow = g.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 5);
    glow.addColorStop(0, 'rgba(255,214,150,0.75)');
    glow.addColorStop(0.5, 'rgba(240,140,110,0.22)');
    glow.addColorStop(1, 'rgba(240,140,110,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, horizon);

    g.fillStyle = '#ffe6b0';
    g.beginPath();
    g.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    g.fill();

    for (let i = 0; i < 7; i++) {
      const cy = rng.range(horizon * 0.22, horizon * 0.86);
      const cw = rng.range(w * 0.16, w * 0.44);
      const cx = rng.range(-cw * 0.2, w);
      const ch = rng.range(h * 0.012, h * 0.032);
      g.globalAlpha = rng.range(0.18, 0.42);
      g.fillStyle = cy > horizon * 0.6 ? '#ffd9a8' : '#e8d0f0';
      g.beginPath();
      g.ellipse(cx, cy, cw * 0.5, ch, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    const ridges = [
      { base: horizon, amp: h * 0.14, color: '#3d2f63', step: w / 9 },
      { base: horizon + h * 0.012, amp: h * 0.1, color: '#2b2149', step: w / 6 }
    ];
    for (let r = 0; r < ridges.length; r++) {
      const ridge = ridges[r];
      g.fillStyle = ridge.color;
      g.beginPath();
      g.moveTo(0, ridge.base);
      let x = 0;
      let y = ridge.base - rng.range(ridge.amp * 0.3, ridge.amp);
      g.lineTo(x, y);
      while (x < w) {
        x += ridge.step * rng.range(0.6, 1.4);
        y = ridge.base - rng.range(ridge.amp * 0.15, ridge.amp);
        g.lineTo(Math.min(x, w), y);
      }
      g.lineTo(w, ridge.base);
      g.closePath();
      g.fill();
    }

    const water = g.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, '#20325f');
    water.addColorStop(0.55, '#16234a');
    water.addColorStop(1, '#0d1631');
    g.fillStyle = water;
    g.fillRect(0, horizon, w, h - horizon);

    // Güneşin sudaki yansıması: tek parça bant yerine kopuk segmentler,
    // yoksa parçalara bölününce barkod gibi görünüyor.
    g.fillStyle = '#ffd79a';
    const bandH = Math.max(1.5, h * 0.005);
    for (let y = horizon + 4; y < h; y += h * 0.019) {
      const t = (y - horizon) / (h - horizon);
      const half = sunR * (0.5 + t * 2.4) * rng.range(0.55, 1.1);
      let x = sunX - half;
      while (x < sunX + half) {
        const seg = half * rng.range(0.12, 0.42);
        const fade = 1 - Math.abs((x + seg / 2 - sunX) / half);
        g.globalAlpha = 0.4 * (1 - t * 0.8) * Math.max(0, fade) * rng.range(0.5, 1);
        g.fillRect(x, y + rng.range(-bandH, bandH), seg, bandH);
        x += seg + half * rng.range(0.05, 0.22);
      }
    }
    g.globalAlpha = 1;

    g.strokeStyle = 'rgba(190,215,255,0.22)';
    g.lineWidth = Math.max(1, h * 0.002);
    for (let i = 0; i < 26; i++) {
      const wy = rng.range(horizon + 6, h);
      const wx = rng.range(0, w);
      const wl = rng.range(w * 0.03, w * 0.13);
      g.beginPath();
      g.moveTo(wx, wy);
      g.lineTo(wx + wl, wy);
      g.stroke();
    }

    const shoreY = h * 0.9;
    g.fillStyle = '#0a1024';
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, shoreY);
    for (let x = 0; x <= w; x += w / 14) {
      g.lineTo(x, shoreY + Math.sin(x / w * 7) * h * 0.012 + rng.range(-h * 0.008, h * 0.008));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();

    for (let i = 0; i < 9; i++) {
      const tx = rng.range(w * 0.02, w * 0.98);
      const th = rng.range(h * 0.06, h * 0.16);
      const tw = th * rng.range(0.22, 0.34);
      const ty = shoreY + rng.range(-h * 0.005, h * 0.01);
      g.fillStyle = '#070c1c';
      g.fillRect(tx - tw * 0.06, ty - th * 0.28, tw * 0.12, th * 0.3);
      g.beginPath();
      g.moveTo(tx, ty - th);
      g.lineTo(tx + tw * 0.5, ty - th * 0.22);
      g.lineTo(tx - tw * 0.5, ty - th * 0.22);
      g.closePath();
      g.fill();
    }

    g.strokeStyle = '#1a1030';
    g.lineWidth = Math.max(1.5, h * 0.0035);
    for (let i = 0; i < 5; i++) {
      const bx = rng.range(w * 0.1, w * 0.9);
      const by = rng.range(h * 0.1, h * 0.36);
      const bs = rng.range(h * 0.012, h * 0.024);
      g.beginPath();
      g.moveTo(bx - bs, by);
      g.quadraticCurveTo(bx - bs * 0.5, by - bs * 0.6, bx, by);
      g.quadraticCurveTo(bx + bs * 0.5, by - bs * 0.6, bx + bs, by);
      g.stroke();
    }

    return c;
  }
};
