// Ok Refleksi — herkesin kendi şeridinde kendi ok dizisi akar.
//
// Oklar aralıksız gelir: doğru tuşa bastığın anda sıradaki ok öne geçer.
// Bekleme yok, sıra yok — bu bir hız yarışı. Dizi herkeste AYNI (tohumdan),
// yani şans değil parmak hızı ayırıyor. Yanlış tuş kısa süre dondurur.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.ok = (function () {
  var A = MG.ayar;
  var R = A.ok;

  // 0 sağ, 1 aşağı, 2 sol, 3 yukarı — tuş adlarıyla aynı sırada
  var TUSLAR = ['d', 's', 'a', 'w'];

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);

    // Tek dizi, herkes aynısını oynar: kimse kolay/zor dizi çekmesin
    var dizi = [];
    for (var i = 0; i < R.diziUzunluk; i++) {
      var y = Math.floor(rng() * 4);
      // Aynı okun üç kez üst üste gelmesi tuşa yaslanmayı ödüllendirirdi
      if (i >= 2 && dizi[i - 1] === y && dizi[i - 2] === y) y = (y + 1) % 4;
      dizi.push(y);
    }

    var d = {
      rng: rng,
      dizi: dizi,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      balonlar: [],
      kalan: R.turSureSn
    };

    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      d.oyuncular[k] = {
        indeks: 0, hata: 0, donma: 0, parlama: 0,
        oncekiTus: {}
      };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) {
        d.botDurum[k] = {
          bekle: R.botTepkiMin + rng() * (R.botTepkiMax - R.botTepkiMin),
          hiz: R.botTepkiMin + rng() * (R.botTepkiMax - R.botTepkiMin)
        };
      }
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function siradakiOk(d, o) {
    return d.dizi[o.indeks % d.dizi.length];
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      o.donma = Math.max(0, o.donma - dt);
      o.parlama = Math.max(0, o.parlama - dt);
      if (d.botDurum[k]) botGuncelle(d, +k, o, dt);
      tuslariOku(d, +k, o);
    }
  }

  function tuslariOku(d, koltuk, o) {
    var g = d.girdiler[koltuk];
    for (var y = 0; y < 4; y++) {
      var tus = TUSLAR[y];
      var basildi = g[tus] && !o.oncekiTus[tus];
      o.oncekiTus[tus] = g[tus];
      if (!basildi || o.donma > 0) continue;

      if (y === siradakiOk(d, o)) {
        o.indeks++;
        o.parlama = 0.25;
      } else {
        o.donma = R.yanlisDonmaSn;
        o.hata++;
        balon(d, koltuk, 'Yanlış!', '#e63946');
        MG.ses.donma();
      }
    }
  }

  function balon(d, koltuk, metin, renk) {
    d.balonlar.push({ koltuk: koltuk, metin: metin, renk: renk, omur: 0.9 });
  }

  // --- bot -----------------------------------------------------------------

  function botGuncelle(d, koltuk, o, dt) {
    var b = d.botDurum[koltuk];
    var g = d.girdiler[koltuk];
    for (var y = 0; y < 4; y++) g[TUSLAR[y]] = false;
    if (o.donma > 0) return;

    b.bekle -= dt;
    if (b.bekle > 0) return;
    b.bekle = b.hiz * (0.85 + d.rng() * 0.3);

    var dogru = siradakiOk(d, o);
    // Ara sıra yanlış tuşa basıp cezayı yesin, kusursuz bot olmasın
    var basilan = d.rng() < R.botHataOlasilik
      ? (dogru + 1 + Math.floor(d.rng() * 3)) % 4
      : dogru;
    g[TUSLAR[basilan]] = true;
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, o.indeks, Math.round(o.donma * 10) / 10, o.hata]);
    }
    return { oy: oy, ka: Math.round(d.kalan * 10) / 10 };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      if (v[1] > o.indeks) o.parlama = 0.25;
      if (v[3] > o.hata) {
        balon(d, v[0], 'Yanlış!', '#e63946');
        MG.ses.donma();
      }
      o.indeks = v[1];
      o.donma = v[2];
      o.hata = v[3];
    }
  }

  function efekt(d, dt) {
    for (var i = d.balonlar.length - 1; i >= 0; i--) {
      d.balonlar[i].omur -= dt;
      if (d.balonlar[i].omur <= 0) d.balonlar.splice(i, 1);
    }
    for (var k in d.oyuncular) {
      d.oyuncular[k].parlama = Math.max(0, d.oyuncular[k].parlama - dt);
    }
  }

  // --- sonuç ---------------------------------------------------------------

  function siralama(d) {
    return Object.keys(d.oyuncular).map(Number).sort(function (a, b) {
      return d.oyuncular[b].indeks - d.oyuncular[a].indeks;
    });
  }

  function bitti(d) {
    if (d.kalan > 0) return null;
    var s = siralama(d);
    if (!s.length) return { kazanan: null };
    if (s.length > 1 && d.oyuncular[s[0]].indeks === d.oyuncular[s[1]].indeks) {
      return { kazanan: null };
    }
    return { kazanan: s[0] };
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = d.oyuncular[k].indeks + ' ok';
    return o;
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  return {
    id: 'ok',
    ad: 'Ok Refleksi',
    kurallar: 'Yön tuşları · Kendi şeridindeki okları sırayla bas · 30 sn’de en çok ok kazanır',
    siradakiOk: siradakiOk,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.okCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuDustu: oyuncuDustu
  };
})();
