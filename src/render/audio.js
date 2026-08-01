window.PP = window.PP || {};

// Prosedürel ses. Dış dosya yok — her ses WebAudio ile anında üretilir,
// böylece oyun tek klasörde kalır ve yükleme beklemesi olmaz.
//
// Tarayıcılar sesi ancak bir kullanıcı hareketinden sonra açıyor; bu yüzden
// ilk tıklamada başlatılır.
PP.Audio = function (config) {
  let ctx = null;
  let master = null;
  let enabled = config.audio.enabled;

  function ready() {
    if (!enabled) return false;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return false; }
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = config.audio.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // Zarf: kısa atak, üstel sönüm. Tıklama sesi çıkmasın diye 0'dan başlar.
  function envelope(gain, t, peak, attack, dur) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(opts) {
    const t = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
    envelope(gain, t, opts.gain || 0.3, opts.attack || 0.005, opts.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  function noise(opts) {
    const t = ctx.currentTime + (opts.delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * opts.dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t + opts.dur);
    filter.Q.value = opts.q || 1;

    const gain = ctx.createGain();
    envelope(gain, t, opts.gain || 0.3, opts.attack || 0.01, opts.dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + opts.dur + 0.02);
  }

  // Her ses bir tarif. Yeni ses eklemek buraya bir satır yazmak demek.
  const recipes = {
    tut: function () { tone({ freq: 760, type: 'square', dur: 0.05, gain: 0.14 }); },
    birak: function () { tone({ freq: 400, type: 'sine', dur: 0.06, gain: 0.12 }); },

    otur: function () {
      tone({ freq: 200, to: 96, type: 'triangle', dur: 0.16, gain: 0.4 });
      noise({ freq: 1600, to: 320, dur: 0.09, gain: 0.16 });
    },

    birles: function () {
      tone({ freq: 620, type: 'sine', dur: 0.07, gain: 0.22 });
      tone({ freq: 930, type: 'sine', dur: 0.09, gain: 0.18, delay: 0.06 });
    },

    parca: function () { tone({ freq: 540, to: 700, type: 'sine', dur: 0.09, gain: 0.13 }); },
    kart: function () {
      tone({ freq: 1180, type: 'sine', dur: 0.1, gain: 0.16 });
      tone({ freq: 1580, type: 'sine', dur: 0.14, gain: 0.13, delay: 0.08 });
    },

    buyu: function () { noise({ freq: 300, to: 2600, filter: 'bandpass', q: 2, dur: 0.28, gain: 0.24 }); },
    uyari: function () {
      tone({ freq: 500, type: 'square', dur: 0.09, gain: 0.2 });
      tone({ freq: 500, type: 'square', dur: 0.09, gain: 0.2, delay: 0.14 });
    },

    deprem: function () {
      noise({ freq: 240, to: 60, dur: 0.7, gain: 0.5 });
      tone({ freq: 70, to: 38, type: 'sine', dur: 0.6, gain: 0.5 });
    },

    ruzgar: function () { noise({ freq: 500, to: 2200, filter: 'bandpass', q: 0.8, dur: 0.55, gain: 0.3 }); },
    darbe: function () { noise({ freq: 900, to: 200, dur: 0.2, gain: 0.3 }); },

    kazandi: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        tone({ freq: f, type: 'triangle', dur: 0.3, gain: 0.24, delay: i * 0.09 });
      });
    },

    kaybettin: function () { tone({ freq: 300, to: 150, type: 'triangle', dur: 0.5, gain: 0.25 }); }
  };

  return {
    // İlk kullanıcı hareketinde çağrılır
    unlock: function () { ready(); },

    play: function (name) {
      if (!recipes[name]) return;
      if (!ready()) return;
      try { recipes[name](); } catch (e) { /* ses oyunu bozmasın */ }
    },

    toggle: function () {
      enabled = !enabled;
      if (enabled) ready();
      return enabled;
    },

    isEnabled: function () { return enabled; }
  };
};
