window.PP = window.PP || {};

// Bağlantı testi. Neden bağlanamadığımızı tahmin etmek yerine ölçer.
//
// Tarayıcı bağlantı kurmadan önce "aday" (candidate) toplar. Üç tür vardır:
//   host  → kendi yerel adresin. Her zaman bulunur, tek başına yeterli değil.
//   srflx → STUN'un söylediği dış adresin. Yoksa STUN çalışmıyor.
//   relay → TURN aktarıcısı üzerinden adres. Yoksa TURN çalışmıyor ve
//           ev bağlantılarının çoğunda oyun kurulamaz.
//
// Bu test tek başına yapılır; karşı tarafa ihtiyaç yoktur.
PP.NetDiag = function (config) {
  return {
    run: function (timeoutMs) {
      return new Promise(function (resolve) {
        const found = { host: 0, srflx: 0, relay: 0 };
        const errors = [];
        let pc;

        try {
          pc = new RTCPeerConnection({ iceServers: config.net.iceServers });
        } catch (e) {
          resolve({ ok: false, found: found, errors: ['WebRTC açılamadı: ' + e.message] });
          return;
        }

        function finish() {
          try { pc.close(); } catch (e) { /* yoksay */ }
          resolve({
            found: found,
            errors: errors,
            stunOk: found.srflx > 0,
            turnOk: found.relay > 0
          });
        }

        const timer = setTimeout(finish, timeoutMs || 8000);

        pc.onicecandidate = function (e) {
          if (!e.candidate) {                 // aday toplama bitti
            clearTimeout(timer);
            finish();
            return;
          }
          const type = e.candidate.type ||
            (e.candidate.candidate.match(/ typ (\w+)/) || [])[1];
          if (found[type] !== undefined) found[type]++;
        };

        // TURN kimlik bilgileri yanlışsa tarayıcı burada hata veriyor
        pc.onicecandidateerror = function (e) {
          if (e.errorCode === 701 || (e.url && e.url.indexOf('turn:') === 0)) {
            errors.push('TURN yanıt vermedi (' + (e.errorCode || '?') + ') ' + (e.url || ''));
          }
        };

        pc.createDataChannel('test');
        pc.createOffer()
          .then(function (offer) { return pc.setLocalDescription(offer); })
          .catch(function (e) {
            errors.push('Teklif oluşturulamadı: ' + e.message);
            clearTimeout(timer);
            finish();
          });
      });
    }
  };
};
