// Çember Kaçış botu — çember üzerinde birkaç aday noktayı puanlar ve en
// güvenlisine doğru kaçar. Tehdide olan açı uzaklığı ne kadar azsa o kadar kötü.
MG.cemberBot = (function () {
  var A = MG.ayar;
  var C = A.cember;
  var TAU = Math.PI * 2;

  function fark(a, b) {
    var f = (a - b) % TAU;
    if (f > Math.PI) f -= TAU;
    if (f < -Math.PI) f += TAU;
    return Math.abs(f);
  }

  // Bir açının ne kadar tehlikeli olduğu: yakın tehditler yüksek puan verir.
  function tehlike(d, aci) {
    var p = 0;
    for (var i = 0; i < d.saldirilar.length; i++) {
      var s = d.saldirilar[i];
      var u = fark(aci, s.aci);
      var esik = s.genislik / 2 + 0.3;
      if (u < esik) p += (esik - u) * (s.evre === 'aktif' ? 6 : 4);
    }
    for (i = 0; i < d.mermiler.length; i++) {
      var m = d.mermiler[i];
      var mu = fark(aci, m.aci);
      if (mu < C.mermiVurmaAci + 0.3) {
        // Uzaktaki mermi daha az acil
        var yakinlik = Math.min(1, m.r / C.yaricap);
        p += (C.mermiVurmaAci + 0.3 - mu) * (2 + yakinlik * 4);
      }
    }
    return p;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.a = g.d = false;

    b.karar -= dt;
    if (b.karar > 0) { uygula(g, b.yon); return; }
    // Her botun kendi tepki süresi var — kusursuz kaçan bot hiç elenmez
    // ve tur bitmez.
    b.karar = b.tepki;

    var simdiki = tehlike(d, o.aci);
    var adim = C.oyuncuHiz * 0.32;
    var sag = tehlike(d, o.aci + adim);
    var sol = tehlike(d, o.aci - adim);

    if (simdiki <= 0.001 && sag <= 0.001 && sol <= 0.001) {
      b.yon = 0; // ortalık sakin, yerinde bekle
    } else if (sol < sag) {
      b.yon = -1;
    } else if (sag < sol) {
      b.yon = 1;
    } else {
      b.yon = b.yon || (d.rng() < 0.5 ? -1 : 1); // eşitse yönünü koru
    }
    uygula(g, b.yon);
  }

  function uygula(g, yon) {
    if (yon > 0) g.d = true;
    else if (yon < 0) g.a = true;
  }

  return { guncelle: guncelle };
})();
