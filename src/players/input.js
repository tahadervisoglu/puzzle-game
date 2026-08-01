window.PP = window.PP || {};

// Girdi katmanı niyet (intent) üretir, oyun durumunu doğrudan değiştirmez.
// Botlar (F2) ve ileride ağ oyuncuları aynı niyetleri üreteceği için
// masa mantığının girdinin kimden geldiğinden haberi olmaz.
PP.Input = function (canvas, bus) {
  let held = null;      // { id, dx, dy }
  const pointer = { x: 0, y: 0, inside: false };

  function toTable(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.button !== 2) return;
    const pt = toTable(e);
    pointer.x = pt.x;
    pointer.y = pt.y;
    // Yakalama başarısız olursa sürükleme yine de çalışmalı
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* yoksay */ }
    // Sağ tık kümeden tek parça koparır
    bus.emit('niyet:tut', { x: pt.x, y: pt.y, detach: e.button === 2 });
    e.preventDefault();
  });

  window.addEventListener('pointermove', function (e) {
    const pt = toTable(e);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.inside =
      pt.x >= 0 && pt.y >= 0 && pt.x <= canvas.clientWidth && pt.y <= canvas.clientHeight;
    if (held) bus.emit('niyet:tasi', { x: pt.x, y: pt.y });
  });

  window.addEventListener('pointerup', function () {
    if (held) bus.emit('niyet:birak', { x: pointer.x, y: pointer.y });
  });

  window.addEventListener('pointercancel', function () {
    if (held) bus.emit('niyet:birak', { x: pointer.x, y: pointer.y });
  });

  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  return {
    pointer: pointer,
    get held() { return held; },
    set held(v) { held = v; }
  };
};
