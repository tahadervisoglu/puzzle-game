window.PP = window.PP || {};

// TURN kimlik bilgilerini hazırlar. Üç yol destekler, bu sırayla:
//   1) servers            → panelden kopyalanan dizi olduğu gibi kullanılır
//   2) username+credential → adresler host'tan üretilir
//   3) apiKey             → kısa ömürlü bilgiler çalışma anında çekilir
//
// Kritik ayrım: TURN sunucusunun alan adı, sağlayıcı panelinin alan adıyla
// aynı değildir. Panel "<uygulama>.metered.live" olsa bile TURN adresleri
// "...relay.metered.ca" üzerindedir; bunu karıştırmak "701 / hiç relay adayı
// yok" hatasına yol açar.
//
// Hiçbiri çalışmazsa oyun çökmez, elimizdeki STUN listesiyle devam eder;
// sadece doğrudan bağlantı kurabilen ağlarda oynanabilir. Ne olduğunu
// gizlememek için son hata saklanır ve bağlantı testinde gösterilir.
PP.Ice = {
  cached: null,
  lastError: null,
  source: null,      // hangi yolun kullanıldığı (teşhis için)

  get: function (config) {
    const base = config.net.iceServers.slice();
    if (this.cached) return Promise.resolve(this.cached);

    const turn = config.net.turn || {};
    const self = this;

    // 1) Panelden yapıştırılan dizi
    if (Array.isArray(turn.servers) && turn.servers.length) {
      this.source = 'panelden yapıştırılan dizi';
      this.cached = base.concat(turn.servers);
      return Promise.resolve(this.cached);
    }

    // 2) Sabit kullanıcı adı / şifre
    if (turn.host && turn.username && turn.credential) {
      // 80 ve 443, UDP/TCP/TLS birlikte: bazı ağlar sadece 443/TCP'ye izin veriyor
      this.source = 'sabit kimlik bilgisi (' + turn.host + ')';
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

    // 3) API anahtarıyla çekme
    const apiHost = turn.apiHost || turn.host;
    if (!turn.apiKey || !apiHost) {
      this.source = 'yok';
      this.cached = base;
      return Promise.resolve(base);
    }

    const url = 'https://' + apiHost + '/api/v1/turn/credentials?apiKey=' +
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
        self.source = 'API anahtarı';
        self.cached = base.concat(list);
        return self.cached;
      })
      .catch(function (e) {
        self.lastError = e.message;
        self.source = 'başarısız (API)';
        self.cached = base;
        return base;
      });
  },

  clear: function () { this.cached = null; this.lastError = null; this.source = null; }
};
