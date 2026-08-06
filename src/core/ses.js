// Prosedürel ses — dosya yok, her şey WebAudio ile anında üretilir.
// AudioContext ilk kullanıcı hareketinden sonra açılabilir; MG.ses.ac()
// ilk tıklamada çağrılır.
MG.ses = (function () {
  var ac = null;
  var sessiz = false;   // MG.ses.sustur(true) ile kapatılır (test ederken şart)

  function baglam() {
    if (sessiz) return null;
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function blip(f1, f2, sure, tip, siddet) {
    var a = baglam();
    if (!a) return;
    var osc = a.createOscillator();
    var kaz = a.createGain();
    osc.type = tip;
    osc.frequency.setValueAtTime(f1, a.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), a.currentTime + sure);
    kaz.gain.setValueAtTime(siddet, a.currentTime);
    kaz.gain.exponentialRampToValueAtTime(0.001, a.currentTime + sure);
    osc.connect(kaz); kaz.connect(a.destination);
    osc.start(); osc.stop(a.currentTime + sure);
  }

  function gurultu(sure, siddet) {
    var a = baglam();
    if (!a) return;
    var n = Math.floor(a.sampleRate * sure);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var kaynak = a.createBufferSource();
    kaynak.buffer = buf;
    var filtre = a.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.setValueAtTime(900, a.currentTime);
    filtre.frequency.exponentialRampToValueAtTime(120, a.currentTime + sure);
    var kaz = a.createGain();
    kaz.gain.setValueAtTime(siddet, a.currentTime);
    kaz.gain.exponentialRampToValueAtTime(0.001, a.currentTime + sure);
    kaynak.connect(filtre); filtre.connect(kaz); kaz.connect(a.destination);
    kaynak.start();
  }

  return {
    ac: function () { try { baglam(); } catch (e) {} },
    sustur: function (deger) {
      sessiz = !!deger;
      if (sessiz && ac && ac.suspend) { try { ac.suspend(); } catch (e) {} }
    },
    sessizMi: function () { return sessiz; },
    ates: function () { blip(240, 70, 0.12, 'square', 0.12); },
    sekme: function () { blip(700, 500, 0.04, 'triangle', 0.06); },
    patlama: function () { gurultu(0.45, 0.35); blip(120, 30, 0.4, 'sawtooth', 0.15); },
    sayim: function () { blip(440, 440, 0.07, 'sine', 0.1); },
    baslat: function () { blip(660, 880, 0.15, 'sine', 0.12); },
    kaldir: function () { blip(300, 520, 0.1, 'triangle', 0.09); },
    birak: function () { blip(420, 200, 0.12, 'triangle', 0.09); },
    kap: function () { blip(880, 1320, 0.08, 'square', 0.08); },
    lazer: function () { blip(1200, 260, 0.16, 'sawtooth', 0.09); },
    zipla: function () { blip(360, 700, 0.11, 'sine', 0.08); },
    yapis: function () { blip(180, 90, 0.18, 'square', 0.1); },
    firlat: function () { blip(520, 980, 0.12, 'triangle', 0.1); },
    iska: function () { blip(300, 220, 0.2, 'sine', 0.07); },
    dusme: function () { blip(400, 60, 0.45, 'sine', 0.12); gurultu(0.3, 0.18); },
    donma: function () { blip(520, 140, 0.35, 'sine', 0.1); }
  };
})();
