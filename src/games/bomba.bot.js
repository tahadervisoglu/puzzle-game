// Bomba Kaos botu.
// Önce hayatta kalır: her karede hangi hücrelerin ne zaman alev alacağını
// çıkarır, tehlikedeyse en yakın güvenli hücreye kaçar. Güvendeyse kutu
// kırmaya ya da rakibi köşeye sıkıştırmaya gider — ama kaçış yolu
// kalmıyorsa bomba bırakmaz, yoksa kendi bombasıyla ölür.
MG.bombaBot = (function () {
  var A = MG.ayar;
  var B = A.bomba;
  var I = MG.bombaIzgara;

  var YONLER = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Her hücre: kaç saniye sonra alev basacak (Infinity = güvenli)
  function tehlikeHaritasi(d) {
    var n = B.sutun * B.satir;
    var t = new Float64Array(n);
    for (var i = 0; i < n; i++) t[i] = Infinity;

    for (var b = 0; b < d.bombalar.length; b++) {
      var bo = d.bombalar[b];
      isaretle(t, bo.cx, bo.cy, bo.fitil);
      for (var y = 0; y < 4; y++) {
        for (var m = 1; m <= bo.menzil; m++) {
          var cx = bo.cx + YONLER[y][0] * m, cy = bo.cy + YONLER[y][1] * m;
          var h = MG.oyunlar.bomba.hucre(d, cx, cy);
          if (h === I.SERT) break;
          isaretle(t, cx, cy, bo.fitil);
          if (h === I.KUTU) break;
        }
      }
    }
    for (var a = 0; a < d.alevler.length; a++) {
      isaretle(t, d.alevler[a].cx, d.alevler[a].cy, 0);
    }
    return t;
  }

  function isaretle(t, cx, cy, sure) {
    if (!I.icinde(cx, cy)) return;
    var i = I.indeks(cx, cy);
    if (sure < t[i]) t[i] = sure;
  }

  function gecilirYap(d) {
    return function (cx, cy) {
      if (MG.oyunlar.bomba.hucre(d, cx, cy) !== I.BOS) return false;
      return !MG.oyunlar.bomba.bombaBul(d, cx, cy);
    };
  }

  // Hedefe giden yolun ilk adımı: hedeften geriye, mesafesi 1 olan komşuya.
  function ilkAdim(uzak, bascx, bascy, hedefIndeks) {
    if (hedefIndeks < 0 || uzak[hedefIndeks] <= 0) return null;
    var cx = hedefIndeks % B.sutun, cy = (hedefIndeks / B.sutun) | 0;
    var mesafe = uzak[hedefIndeks];
    while (mesafe > 1) {
      var bulundu = false;
      for (var y = 0; y < 4; y++) {
        var nx = cx + YONLER[y][0], ny = cy + YONLER[y][1];
        if (!I.icinde(nx, ny)) continue;
        if (uzak[I.indeks(nx, ny)] === mesafe - 1) {
          cx = nx; cy = ny; mesafe--; bulundu = true;
          break;
        }
      }
      if (!bulundu) return null;
    }
    return { cx: cx, cy: cy };
  }

  // Kaçarken sadece güvenli değil, VARANA KADAR güvende kalınabilen hücre
  // seçilmeli: adım başına kabaca bir hücre süresi hesaba katılıyor.
  function kacisHedefi(d, o, uzak, tehlike) {
    var adimSn = B.hucre / Math.max(60, o.hiz);
    var enIyi = -1, enAz = Infinity;
    for (var i = 0; i < uzak.length; i++) {
      if (uzak[i] < 0) continue;
      if (tehlike[i] !== Infinity && tehlike[i] < uzak[i] * adimSn + 0.25) continue;
      if (tehlike[i] !== Infinity) continue;
      if (uzak[i] < enAz) { enAz = uzak[i]; enIyi = i; }
    }
    return enIyi;
  }

  function enYakinHedef(d, koltuk, uzak) {
    var enIyi = -1, enAz = Infinity;
    // Kırılabilir kutuya komşu hücreler
    for (var i = 0; i < uzak.length; i++) {
      if (uzak[i] < 0 || uzak[i] >= enAz) continue;
      var cx = i % B.sutun, cy = (i / B.sutun) | 0;
      for (var y = 0; y < 4; y++) {
        var h = MG.oyunlar.bomba.hucre(d, cx + YONLER[y][0], cy + YONLER[y][1]);
        if (h === I.KUTU) { enAz = uzak[i]; enIyi = i; break; }
      }
    }
    // Rakip daha yakınsa onu tercih et
    for (var k in d.oyuncular) {
      if (+k === koltuk || !d.oyuncular[k].canli) continue;
      var r = d.oyuncular[k];
      var ri = I.indeks(I.hucreX(r.x), I.hucreY(r.y));
      if (uzak[ri] >= 0 && uzak[ri] < enAz) { enAz = uzak[ri]; enIyi = ri; }
    }
    return enIyi;
  }

  // Buraya bomba bırakırsam kaçacak yerim kalır mı?
  function kacisVarMi(d, o, cx, cy) {
    var sahte = { cx: cx, cy: cy, menzil: o.menzil, fitil: B.fitilSn };
    d.bombalar.push(sahte);
    var tehlike = tehlikeHaritasi(d);
    var uzak = I.bfs(cx, cy, gecilirYap(d));
    d.bombalar.pop();
    return kacisHedefi(d, o, uzak, tehlike) >= 0;
  }

  function bombaFaydaliMi(d, koltuk, cx, cy) {
    for (var y = 0; y < 4; y++) {
      if (MG.oyunlar.bomba.hucre(d, cx + YONLER[y][0], cy + YONLER[y][1]) === I.KUTU) {
        return true;
      }
    }
    for (var k in d.oyuncular) {
      if (+k === koltuk || !d.oyuncular[k].canli) continue;
      var r = d.oyuncular[k];
      var dx = Math.abs(I.hucreX(r.x) - cx), dy = Math.abs(I.hucreY(r.y) - cy);
      if ((dx === 0 && dy <= 2) || (dy === 0 && dx <= 2)) return true;
    }
    return false;
  }

  // Yön, karar anında tuş adına çevrilir; sonraki karelerde aynı tuş basılı
  // tutulur (karar aralığı boyunca hücreden hücreye ilerlemesi için).
  function yonHesapla(cx, cy, hedef) {
    if (!hedef) return null;
    if (hedef.cx > cx) return 'd';
    if (hedef.cx < cx) return 'a';
    if (hedef.cy > cy) return 's';
    if (hedef.cy < cy) return 'w';
    return null;
  }

  function guncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    g.w = g.a = g.s = g.d = g.space = false;

    b.karar -= dt;
    if (b.karar > 0) { uygula(g, b); return; }
    b.karar = B.botKararSn;
    b.yon = null; b.bomba = false;

    var cx = I.hucreX(o.x), cy = I.hucreY(o.y);
    var tehlike = tehlikeHaritasi(d);
    var uzak = I.bfs(cx, cy, gecilirYap(d));
    var kendiIndeks = I.indeks(cx, cy);

    if (tehlike[kendiIndeks] !== Infinity) {          // tehlikedeyiz: kaç
      var kacis = kacisHedefi(d, o, uzak, tehlike);
      b.yon = yonHesapla(cx, cy, ilkAdim(uzak, cx, cy, kacis));
      return uygula(g, b);
    }

    if (bombaFaydaliMi(d, koltuk, cx, cy) && kacisVarMi(d, o, cx, cy)) {
      b.bomba = true;
      return uygula(g, b);
    }

    var hedef = enYakinHedef(d, koltuk, uzak);
    b.yon = yonHesapla(cx, cy, ilkAdim(uzak, cx, cy, hedef));
    uygula(g, b);
  }

  function uygula(g, b) {
    if (b.bomba) g.space = true;
    if (b.yon) g[b.yon] = true;
  }

  return { guncelle: guncelle, tehlikeHaritasi: tehlikeHaritasi };
})();
