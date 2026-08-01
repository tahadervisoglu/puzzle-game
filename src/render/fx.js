window.PP = window.PP || {};

// Panel başına görsel efekt katmanı: sarsıntı, partiküller, renk parlaması.
// Simülasyona hiç dokunmaz — sadece olan biteni hissettirir.
// Büyü -> görsel eşlemesi. Büyüler ne olacağını bilmez, sadece "şu oyuncuda
// şu şey oldu" der; nasıl görüneceği burada durur.
PP.fxFor = function (player, kind, data) {
  const fx = player.state.fx;
  if (!fx) return;
  const w = player.table.state.width;
  const h = player.table.state.height;

  switch (kind) {
    case 'deprem':
      fx.shake(14);
      fx.flash('226,120,60', 0.5);
      if (data) fx.dust(data.x, data.y, 14, 1.4);
      break;
    case 'ruzgar':
      fx.shake(5);
      fx.wind(w, h);
      break;
    case 'takas':
      fx.flash('160,150,255', 0.55);
      fx.shake(3);
      break;
    case 'yapistir':
      fx.flash('120,200,160', 0.45);
      fx.shake(4);
      break;
    case 'hirsiz':
      fx.flash('226,75,74', 0.45);
      fx.shake(6);
      break;
    case 'karartma':
    case 'sis':
      fx.flash('90,100,140', 0.4);
      break;
    case 'kilit':
      fx.flash('180,140,80', 0.4);
      fx.shake(3);
      break;
    case 'isik':
      fx.flash('93,202,165', 0.4);
      break;
    case 'oturdu':
      if (data) fx.dust(data.x, data.y, 4, 0.5);
      break;
  }
};

PP.Fx = function (config) {
  const cfg = config.fx;
  const state = {
    shake: 0,
    flash: 0,
    flashColor: '255,255,255',
    particles: [],
    seed: 1
  };

  // Sarsıntı her karede farklı yöne gitmeli ama Math.random kullanmadan
  function noise() {
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    return (state.seed / 4294967296) * 2 - 1;
  }

  function spawn(p) {
    if (state.particles.length >= cfg.maxParticles) return;
    state.particles.push(p);
  }

  return {
    state: state,

    shake: function (amount) {
      state.shake = Math.min(cfg.maxShake, state.shake + amount);
    },

    flash: function (rgb, amount) {
      state.flashColor = rgb;
      state.flash = Math.max(state.flash, amount);
    },

    // Rüzgar: paneli boydan boya geçen savrulma çizgileri
    wind: function (w, h) {
      for (let i = 0; i < cfg.windParticles; i++) {
        const life = 0.5 + Math.abs(noise()) * 0.7;
        spawn({
          kind: 'wind',
          x: -40 + noise() * 60,
          y: h * (0.5 + noise() * 0.5),
          vx: 520 + Math.abs(noise()) * 620,
          vy: noise() * 40,
          len: 26 + Math.abs(noise()) * 58,
          life: life,
          max: life
        });
      }
    },

    // Yerleşme darbesi: hücreden dışa yayılan halka
    ring: function (x, y, size) {
      spawn({
        kind: 'ring',
        x: x, y: y,
        r0: size * 0.35,
        r1: size * 1.15,
        life: 0.32,
        max: 0.32
      });
    },

    // Deprem / oturma: toz bulutu
    dust: function (x, y, count, power) {
      for (let i = 0; i < count; i++) {
        const life = 0.35 + Math.abs(noise()) * 0.5;
        spawn({
          kind: 'dust',
          x: x + noise() * 12,
          y: y + noise() * 12,
          vx: noise() * 180 * power,
          vy: -Math.abs(noise()) * 150 * power - 30,
          size: 2 + Math.abs(noise()) * 4,
          life: life,
          max: life
        });
      }
    },

    update: function (dt) {
      state.shake *= Math.pow(cfg.shakeDecay, dt * 60);
      if (state.shake < 0.2) state.shake = 0;
      state.flash *= Math.pow(cfg.flashDecay, dt * 60);
      if (state.flash < 0.01) state.flash = 0;

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life -= dt;
        if (p.life <= 0) { state.particles.splice(i, 1); continue; }
        if (p.kind === 'ring') continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'dust') p.vy += 420 * dt;   // yerçekimi
      }
    },

    offset: function () {
      if (!state.shake) return { x: 0, y: 0 };
      return { x: noise() * state.shake, y: noise() * state.shake };
    },

    draw: function (ctx, w, h) {
      for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        const t = p.life / p.max;
        if (p.kind === 'ring') {
          const k = 1 - t;
          ctx.strokeStyle = 'rgba(190,205,255,' + (0.5 * t).toFixed(3) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * k, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === 'wind') {
          ctx.strokeStyle = 'rgba(200,220,255,' + (0.5 * t).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len, p.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(214,206,190,' + (0.55 * t).toFixed(3) + ')';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      if (state.flash > 0) {
        ctx.fillStyle = 'rgba(' + state.flashColor + ',' + (state.flash * 0.5).toFixed(3) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    },

    clear: function () {
      state.particles.length = 0;
      state.shake = 0;
      state.flash = 0;
    }
  };
};
