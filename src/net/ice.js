window.PP = window.PP || {};

// TURN kimlik bilgilerini hazırlar. İki yol destekler:
//   1) Sabit bilgiler (username + credential) — panelden kopyalanır
//   2) API anahtarı — kısa ömürlü bilgiler çalışma anında çekilir
//
// Hiçbiri çalışmazsa oyun çökmez, elimizdeki STUN listesiyle devam eder;
// sadece doğrudan bağlantı kurabilen ağlarda oynanabilir. Ne olduğunu
// gizlememek için son hata saklanır ve bağlantı testinde gösterilir.
PP.Ice = {
  cached: null,
  lastError: null,

  get: function (config) {
    const base = config.net.iceServers.slice();
    if (this.cached) return Promise.resolve(this.cached);

    const turn = config.net.turn;
    const self = this;
    if (!turn || !turn.host) {
      this.cached = base;
      return Promise.resolve(base);
    }

    // 1) Sabit bilgiler
    if (turn.username && turn.credential) {
      // 80 ve 443 ayrı ayrı denenir; bazı ağlar sadece 443/TCP'ye izin veriyor
      this.cached = base.concat([{
        urls: [
          'turn:' + turn.host + ':80',
          'turn:' + turn.host + ':80?transport=tcp',
          'turn:' + turn.host + ':443',
          'turns:' + turn.host + ':443?transport=tcp'
        ],
        username: turn.username,
        credential: turn.credential
      }]);
      return Promise.resolve(this.cached);
    }

    // 2) API anahtarıyla çekme
    if (!turn.apiKey) {
      this.cached = base;
      return Promise.resolve(base);
    }

    const url = 'https://' + turn.host + '/api/v1/turn/credentials?apiKey=' +
      encodeURIComponent(turn.apiKey);

    return fetch(url)
      .then(function (r) {
        return r.text().then(function (body) {
          if (!r.ok) throw new Error('sağlayıcı reddetti (' + r.status + '): ' + body.slice(0, 120));
          return JSON.parse(body);
        });
      })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) throw new Error('boş liste döndü');
        self.lastError = null;
        self.cached = base.concat(list);
        return self.cached;
      })
      .catch(function (e) {
        self.lastError = e.message;
        self.cached = base;
        return base;
      });
  },

  clear: function () { this.cached = null; this.lastError = null; }
};
