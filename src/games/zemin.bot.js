// Zemin Çöküyor botu.
// Altındaki karo çökmeden önce yeni bir karoya geçmeli. Sadece "en yakın
// sağlam karo"ya gitmek yetmiyor: bot kendini zeminin kenarında, etrafı
// çökmüş bir karoda buluyordu. Bu yüzden hedefi seçerken karonun kaç sağlam
// komşusu olduğuna da bakıyor.
MG.zeminBot = (function () {
  var A = MG.ayar;
  var Z = A.zemin;

  var ARAMA = 230;   // bu yarıçaptaki karolar aday

  function saglamKomsuSayisi(d, O, kr) {
    var n = 0;
    for (var i = 0; i < d.karolar.length; i++) {
      var k2 = d.karolar[i];
      if (k2 === kr || k2.durum !== O.SAGLAM) continue;
      var dx = k2.x - kr.x, dy = k2.y - kr.y;
      if (dx * dx + dy * dy < (Z.yaricap * 2.2) * (Z.yaricap * 2.2)) n++;
    }
    return n;
  }

  // Ayağının altı çatladıysa incelik yapma: en yakın sağlam karoya atla.
  // Uzaktaki "geniş alan"ı hedefleyen bot yolda çöken karolara basıp ölüyordu.
  function acilKacis(d, O, o) {
    var enIyi = null, enAz = Infinity;
    for (var i = 0; i < d.karolar.length; i++) {
      var kr = d.karolar[i];
      if (kr.durum !== O.SAGLAM) continue;
      var dx = kr.x - o.x, dy = kr.y - o.y;
      var uz2 = dx * dx + dy * dy;
      if (uz2 < enAz) { enAz = uz2; enIyi = kr; }
    }
    return enIyi;
  }

  function hedefSec(d, O, o) {
    var enIyi = null, enIyiPuan = -Infinity;
    var yedek = null, yedekPuan = -Infinity;  // sağlam kalmadıysa çatlak da olur
    for (var i = 0; i < d.karolar.length; i++) {
      var kr = d.karolar[i];
      if (kr.durum !== O.SAGLAM && kr.durum !== O.CATLAK) continue;
      var dx = kr.x - o.x, dy = kr.y - o.y;
      var uz2 = dx * dx + dy * dy;
      if (uz2 > ARAMA * ARAMA) continue;
      var uz = Math.sqrt(uz2);

      if (kr.durum === O.SAGLAM) {
        // Açık alan mesafeden çok daha önemli: yakındaki tek tük sağlam
        // karolara zıplayan bot kendi çöküntüsünün ortasında sıkışıyordu.
        var puan = saglamKomsuSayisi(d, O, kr) * 14 - uz * 0.35;
        if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = kr; }
      } else {
        // Çatlak karo: en çok ömrü kalan işe yarar
        var yp = kr.sayac * 40 - uz;
        if (yp > yedekPuan) { yedekPuan = yp; yedek = kr; }
      }
    }
    // Etrafta sağlam karo yoksa donup ölmektense çatlağa atla
    return enIyi || yedek;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    var O = MG.oyunlar.zemin;
    g.w = g.a = g.s = g.d = false;

    b.karar -= dt;
    var altim = O.karoBul(d, o.x, o.y);
    var vardi = b.hedef &&
      Math.abs(b.hedef.x - o.x) < 5 && Math.abs(b.hedef.y - o.y) < 5;

    // Ayağının altı sağlam değilse her karede yeniden karar ver
    var tehlikede = !altim || altim.durum !== O.SAGLAM;

    if (tehlikede) {
      b.hedef = acilKacis(d, O, o) || hedefSec(d, O, o);
      b.karar = Z.botKararSn;
    } else if (b.karar <= 0 || !b.hedef || vardi ||
               (b.hedef.durum !== O.SAGLAM && b.hedef.durum !== O.CATLAK) ||
               b.hedef === altim) {
      b.karar = Z.botKararSn;
      b.hedef = hedefSec(d, O, o);
    }
    if (!b.hedef) return;

    var dx = b.hedef.x - o.x, dy = b.hedef.y - o.y;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    if (dx > 3) g.d = true; else if (dx < -3) g.a = true;
    if (dy > 3) g.s = true; else if (dy < -3) g.w = true;
  }

  return { guncelle: guncelle };
})();
