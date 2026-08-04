// Bağlantı testi — tek başına çalışır, karşı tarafa ihtiyaç duymaz.
// RTCPeerConnection açıp aday toplar, üç katmanı ayrı ayrı raporlar.
// relay adayı yoksa TURN çalışmıyor demektir (arkadaşlar bağlanamaz).
MG.bagTest = function (rapor) {
  var sonuc = { host: false, stun: false, turn: false };
  var pc;
  try {
    pc = new RTCPeerConnection({ iceServers: MG.net.iceServersAl() });
  } catch (e) {
    return rapor('RTCPeerConnection açılamadı: ' + e.message, null);
  }
  pc.createDataChannel('test');
  pc.onicecandidate = function (ev) {
    if (!ev.candidate) return bitir();
    var c = ev.candidate.candidate || '';
    if (c.indexOf(' typ host') >= 0) sonuc.host = true;
    if (c.indexOf(' typ srflx') >= 0) sonuc.stun = true;
    if (c.indexOf(' typ relay') >= 0) sonuc.turn = true;
  };
  pc.createOffer()
    .then(function (o) { return pc.setLocalDescription(o); })
    .catch(function (e) { bitir('Teklif oluşturulamadı: ' + e.message); });
  var bittiMi = false;
  var zam = setTimeout(bitir, 8000);
  function bitir(hata) {
    if (bittiMi) return;
    bittiMi = true;
    clearTimeout(zam);
    try { pc.close(); } catch (e) {}
    rapor(hata || null, sonuc);
  }
};
