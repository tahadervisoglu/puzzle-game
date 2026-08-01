window.PP = window.PP || {};

// Denge ayarlarını çalışırken denemek için. Kalıcı değişiklik için
// src/core/config.js düzenlenir; burası sadece hızlı deneme içindir.
PP.Tuner = function (game, config) {
  const panel = document.getElementById('tuner');
  const toggle = document.getElementById('tuner-toggle');

  function bind(id, initial, onInput, format) {
    const input = document.getElementById(id);
    const out = document.getElementById(id + '-out');
    if (!input) return;
    input.value = initial;
    out.textContent = format ? format(initial) : initial;
    input.addEventListener('input', function () {
      const v = Number(input.value);
      out.textContent = format ? format(v) : v;
      onInput(v);
    });
  }

  const pct = function (v) { return v + '%'; };

  bind('t-cols', config.puzzle.cols, function (v) {
    config.puzzle.cols = v;
    game.rebuild();
  });

  bind('t-rows', config.puzzle.rows, function (v) {
    config.puzzle.rows = v;
    game.rebuild();
  });

  bind('t-drip', Math.round(config.pool.intervalMs / 100) / 10, function (v) {
    config.pool.intervalMs = v * 1000;
  }, function (v) { return v + 's'; });

  bind('t-tray', config.pool.trayLimit, function (v) {
    config.pool.trayLimit = v;
  });

  bind('t-snap', Math.round(config.snap.toleranceRatio * 100), function (v) {
    config.snap.toleranceRatio = v / 100;
  }, pct);

  bind('t-join', Math.round(config.join.toleranceRatio * 100), function (v) {
    config.join.toleranceRatio = v / 100;
  }, pct);

  bind('t-botspeed', 100, game.setBotSpeed, pct);
  bind('t-boterr', 14, game.setBotError, pct);

  document.getElementById('t-reveal').addEventListener('click', game.revealAll);
  document.getElementById('t-restart').addEventListener('click', game.restart);
  document.getElementById('t-newart').addEventListener('click', game.newArtwork);

  function setOpen(open) { panel.hidden = !open; }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });

  window.addEventListener('keydown', function (e) {
    if (e.key === 't' || e.key === 'T') setOpen(panel.hidden);
  });
};
