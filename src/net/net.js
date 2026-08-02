window.PP = window.PP || {};

// Bağlantı katmanı. Oyunun geri kalanı bu dosyadan habersizdir; sadece mesaj
// gönderir ve alır.
//
// Yıldız topolojisi: herkes oda sahibine bağlanır, oda sahibi mesajları
// dağıtır. Herkesin herkese bağlandığı düzenden çok daha az şey ters gider.
//
// PeerJS tembel yüklenir — tek kişilik oyun oynanırken ağ kodu hiç indirilmez.
PP.Net = function (config) {
  const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const PREFIX = 'puzzleparty-';
  // Birbirine benzeyen harf/rakamlar (0/O, 1/I) kod okurken hata çıkarıyor
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const handlers = {};
  const state = {
    role: null,        // 'host' | 'guest'
    code: null,
    selfId: null,
    peer: null,
    conns: [],         // oda sahibinde: misafir bağlantıları
    hostConn: null,    // misafirde: oda sahibine bağlantı
    ready: false,
    iceState: null
  };

  function emit(type, payload, from) {
    const list = handlers[type];
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](payload, from);
  }

  function loadLib() {
    if (window.Peer) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = PEERJS_URL;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        reject(new Error('Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'));
      };
      document.head.appendChild(s);
    });
  }

  function randomCode() {
    let out = '';
    for (let i = 0; i < 4; i++) {
      out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
  }

  // TURN aktarıcıları olmadan CGNAT arkasındaki ev bağlantıları birbirini
  // bulamıyor; bağlantı sonsuza kadar kurulmayı bekliyor.
  function peerOptions() {
    return { config: { iceServers: config.net.iceServers, sdpSemantics: 'unified-plan' } };
  }

  // Bağlantı neden kurulamadı sorusunu cevaplayabilmek için ICE durumunu izle
  function watchIce(conn) {
    const pc = conn.peerConnection;
    if (!pc) return;
    pc.oniceconnectionstatechange = function () {
      state.iceState = pc.iceConnectionState;
      if (pc.iceConnectionState === 'failed') {
        emit('hata', { error: new Error('Doğrudan bağlantı kurulamadı (ağ engeli).') });
      }
    };
  }

  function wireIncoming(conn) {
    conn.on('data', function (msg) {
      if (!msg || !msg.t) return;
      // Oda sahibi aldığı mesajı diğer misafirlere de dağıtır
      if (state.role === 'host') relay(msg, conn.peer);
      emit(msg.t, msg, conn.peer);
    });
    conn.on('close', function () {
      const i = state.conns.indexOf(conn);
      if (i >= 0) state.conns.splice(i, 1);
      emit('ayrildi', { id: conn.peer }, conn.peer);
    });
  }

  // Önce oda kurup sonra katılmaya çalışınca eski oda ayakta kalıyor ve
  // durum bozuluyordu; her yeni denemeden önce temizle.
  function reset() {
    if (state.peer) {
      try { state.peer.destroy(); } catch (e) { /* yoksay */ }
    }
    state.peer = null;
    state.conns = [];
    state.hostConn = null;
    state.role = null;
    state.code = null;
    state.selfId = null;
    state.ready = false;
    state.iceState = null;
  }

  function relay(msg, exceptId) {
    for (let i = 0; i < state.conns.length; i++) {
      const c = state.conns[i];
      if (c.peer === exceptId || !c.open) continue;
      c.send(msg);
    }
  }

  return {
    state: state,

    on: function (type, fn) {
      (handlers[type] || (handlers[type] = [])).push(fn);
    },

    // Oda kurar, kısa oda kodunu döndürür
    host: function () {
      reset();
      return loadLib().then(function () {
        return new Promise(function (resolve, reject) {
          let attempt = 0;

          function tryCode() {
            const code = randomCode();
            const peer = new Peer(PREFIX + code, peerOptions());

            peer.on('open', function (id) {
              state.peer = peer;
              state.role = 'host';
              state.code = code;
              state.selfId = id;
              state.ready = true;
              peer.on('connection', function (conn) {
                watchIce(conn);
                conn.on('open', function () {
                  state.conns.push(conn);
                  emit('katildi', { id: conn.peer }, conn.peer);
                });
                wireIncoming(conn);
              });
              resolve(code);
            });

            peer.on('error', function (err) {
              // Kod tutulmuşsa başka bir kod dene
              if (err && err.type === 'unavailable-id' && attempt < 6) {
                attempt++;
                peer.destroy();
                tryCode();
                return;
              }
              if (!state.ready) reject(err);
              else emit('hata', { error: err });
            });
          }

          tryCode();
        });
      });
    },

    // Koda göre odaya katılır
    join: function (code) {
      const clean = String(code || '').trim().toUpperCase();
      if (clean.length !== 4) return Promise.reject(new Error('Oda kodu 4 karakter olmalı.'));

      reset();
      return loadLib().then(function () {
        return new Promise(function (resolve, reject) {
          const peer = new Peer(undefined, peerOptions());
          let settled = false;

          // Sonsuza kadar "Bağlanılıyor" yazmasın
          const timer = setTimeout(function () {
            if (settled) return;
            settled = true;
            peer.destroy();
            reject(new Error(
              'Bağlantı kurulamadı. Oda kodu doğruysa ağınız doğrudan ' +
              'bağlantıya izin vermiyor olabilir.'
            ));
          }, config.net.connectTimeoutMs);

          peer.on('open', function (id) {
            state.peer = peer;
            state.role = 'guest';
            state.code = clean;
            state.selfId = id;

            const conn = peer.connect(PREFIX + clean, { reliable: true });
            watchIce(conn);
            conn.on('open', function () {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              state.hostConn = conn;
              state.ready = true;
              resolve(conn);
            });
            wireIncoming(conn);
            conn.on('close', function () {
              state.hostConn = null;
              emit('kopdu', {});
            });
          });

          peer.on('error', function (err) {
            if (settled) { emit('hata', { error: err }); return; }
            settled = true;
            clearTimeout(timer);
            if (err && err.type === 'peer-unavailable') {
              reject(new Error('Böyle bir oda bulunamadı: ' + clean));
            } else {
              reject(err);
            }
          });
        });
      });
    },

    // Oda sahibinde herkese, misafirde oda sahibine gider
    send: function (msg) {
      if (state.role === 'host') relay(msg, null);
      else if (state.hostConn && state.hostConn.open) state.hostConn.send(msg);
    },

    peerCount: function () {
      return state.role === 'host' ? state.conns.length : (state.hostConn ? 1 : 0);
    },

    close: reset
  };
};
