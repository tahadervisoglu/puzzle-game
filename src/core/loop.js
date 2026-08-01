window.PP = window.PP || {};

// Sabit adımlı simülasyon, serbest render. Simülasyon kare hızından bağımsız
// ilerler; determinizm ve ileride ağ senkronu bunu gerektiriyor.
PP.Loop = function (stepMs, update, render) {
  let running = false;
  let last = 0;
  let acc = 0;

  function frame(now) {
    if (!running) return;
    let delta = now - last;
    last = now;
    // Sekme arka plana alınıp geri gelince spiral of death'i engelle
    if (delta > 250) delta = 250;

    acc += delta;
    while (acc >= stepMs) {
      update(stepMs / 1000);
      acc -= stepMs;
    }
    render(acc / stepMs);
    requestAnimationFrame(frame);
  }

  return {
    start: function () {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      requestAnimationFrame(frame);
    },
    stop: function () { running = false; }
  };
};
