// Yokuş Aşağı botu — tek kararı var: ne zaman zıplayacak.
// Engel yok, rakip var: hemen önündekine yetişmek üzereyse üstüne binmek
// için zıplar. Her botun kendi tepki payı vardır, kusursuz olmasın.
MG.yokusBot = (function () {
  var A = MG.ayar;
  var K = A.yokus;

  var HAVA_SN = (2 * K.zipKuvvet) / K.yercekimi; // düz zeminde uçuş süresi

  // Önündeki en yakın rakibe kaç saniye var? (yalnızca kendisiyle aynı
  // seviyedekiler sayılır — tepesindekinin üstüne zıplamanın anlamı yok)
  function ondekineKalanSn(d, o) {
    var enAz = Infinity;
    var hiz = Math.max(60, o.vs);
    for (var k in d.oyuncular) {
      var b = d.oyuncular[k];
      if (b === o) continue;
      if (Math.abs(b.h - o.h) > K.boy * 0.8) continue;
      var uz = b.s - o.s;
      if (uz <= 0) continue;
      var sn = (uz - K.boy) / hiz;
      if (sn < enAz) enAz = sn;
    }
    return enAz;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.space = false;
    if (!o.yerde) return;

    // Rakibe çarpmadan hemen önce zıpla: tepe noktası onun üstüne denk gelsin
    var hedef = HAVA_SN * 0.35 + b.tepki;
    if (ondekineKalanSn(d, o) <= hedef) g.space = true;
  }

  return { guncelle: guncelle };
})();
