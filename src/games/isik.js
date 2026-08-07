// Işık Duvarı — durmak yok. Sürekli ilerlersin ve arkanda kalıcı bir duvar
// bırakırsın. Duvara, rakibin duvarına ya da kenara değen elenir; son kalan
// kazanır. Alan her saniye daralır, hız da zamanla artar.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.isik = (function () {
  var A = MG.ayar;
  var L = A.isik;
  var W = A.dunya.w, H = A.dunya.h;

  var SUTUN = Math.floor(W / L.hucre);
  var SATIR = Math.floor(H / L.hucre);

  // 0 = boş, aksi halde (koltuk + 1)
  function indeks(cx, cy) { return cy * SUTUN + cx; }
  function hucreX(x) { return Math.floor(x / L.hucre); }
  function hucreY(y) { return Math.floor(y / L.hucre); }

  // Yönler: 0 sağ, 1 aşağı, 2 sol, 3 yukarı
  var YON = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      izler: new Uint8Array(SUTUN * SATIR),
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      elenenler: [],
      parcalar: [],
      hiz: L.hiz,
      gecen: 0,
      kalan: L.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    // Merkez etrafında çembere diz, herkes merkeze doğru baksın
    var bas = rng() * Math.PI * 2;
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var a = bas + (i / oturanlar.length) * Math.PI * 2;
      var x = W / 2 + Math.cos(a) * (W / 2 - L.kenarBosluk);
      var y = H / 2 + Math.sin(a) * (H / 2 - L.kenarBosluk);
      // Merkeze bakan yönü dört yöne yuvarla
      var yon = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))
        ? (Math.cos(a) > 0 ? 2 : 0)
        : (Math.sin(a) > 0 ? 3 : 1);

      d.oyuncular[s] = {
        x: x, y: y, yon: yon, bekleyen: null,
        canli: true,
        cx: hucreX(x), cy: hucreY(y)
      };
      d.izler[indeks(d.oyuncular[s].cx, d.oyuncular[s].cy)] = s + 1;
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0 };
    }
    return d;
  }

  // Tuşlar yön seçer; geri dönüş yok, kendi duvarına anında girerdin.
  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
    if (!basili) return;
    var o = d.oyuncular[koltuk];
    if (!o || !o.canli) return;
    var istenen = tus === 'd' ? 0 : (tus === 's' ? 1 : (tus === 'a' ? 2 : (tus === 'w' ? 3 : -1)));
    if (istenen < 0) return;
    if (istenen === (o.yon + 2) % 4) return;
    o.bekleyen = istenen;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    d.gecen += dt;
    d.hiz = Math.min(L.maxHiz, L.hiz + Math.floor(d.gecen / L.hizArtisSn) * L.hizArtisi);

    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) continue;
      if (d.botDurum[k]) MG.isikBot.guncelle(d, +k, dt);
      ilerle(d, +k, o, dt);
    }
  }

  function ilerle(d, koltuk, o, dt, tahminMi) {
    o.x += YON[o.yon][0] * d.hiz * dt;
    o.y += YON[o.yon][1] * d.hiz * dt;

    var cx = hucreX(o.x), cy = hucreY(o.y);
    if (cx === o.cx && cy === o.cy) return;   // hâlâ aynı hücrede

    // Tahminde ölüm yok: elemeyi sunucu yapar. İstemci kendini öldürürse
    // sunucu hayatta derken oyuncu ölmüş görünür ve geri dirilir.
    if (cx < 0 || cy < 0 || cx >= SUTUN || cy >= SATIR) {
      return tahminMi ? undefined : oldur(d, koltuk, o);
    }
    if (d.izler[indeks(cx, cy)]) {
      return tahminMi ? undefined : oldur(d, koltuk, o);
    }

    d.izler[indeks(cx, cy)] = koltuk + 1;
    o.cx = cx; o.cy = cy;

    // Dönüşü hücre sınırında uygula ve eksene hizala; yoksa duvarlar
    // birbirine göre kayık çiziliyor ve çarpışma haksız görünüyor.
    if (o.bekleyen != null && o.bekleyen !== o.yon) {
      o.yon = o.bekleyen;
      o.x = cx * L.hucre + L.hucre / 2;
      o.y = cy * L.hucre + L.hucre / 2;
    }
    o.bekleyen = null;
  }

  // İz bırakmak tahmine dahil: izler ağdan gelmiyor, her istemci konumlardan
  // kendisi dolduruyor. Dönüşün anında görünmesi de buradan geliyor —
  // bu oyunda tek girdi dönüş, gecikmesi en çok burada batıyordu.
  function tahmin(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    if (!o || !o.canli) return;
    ilerle(d, koltuk, o, dt, true);
    MG.tahmin.pozKaydet(o, MG.simdi());
  }

  function oldur(d, koltuk, o) {
    o.canli = false;
    if (d.elenenler.indexOf(koltuk) < 0) d.elenenler.push(koltuk);
    patlama(d, o);
    MG.ses.patlama();
  }

  function patlama(d, o) {
    for (var i = 0; i < 20; i++) {
      var a = Math.random() * Math.PI * 2;
      var h = 40 + Math.random() * 160;
      d.parcalar.push({
        x: o.x, y: o.y, vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.4
      });
    }
    d.sarsinti = 0.3;
  }

  // --- sonuç ---------------------------------------------------------------

  function canlilar(d) {
    var l = [];
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].canli) l.push(+k);
    }
    return l;
  }

  function bitti(d) {
    var l = canlilar(d);
    if (l.length === 1) return { kazanan: l[0] };
    if (l.length === 0) return { kazanan: null };
    if (d.kalan <= 0) return { kazanan: null };
    return null;
  }

  function siralama(d) {
    return canlilar(d).concat(d.elenenler.slice().reverse());
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) o[k] = d.oyuncular[k].canli ? 'hayatta' : 'çarptı';
    return o;
  }

  function oyuncuOlu(d, koltuk) {
    return !!(d.oyuncular[koltuk] && !d.oyuncular[koltuk].canli);
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  // --- ağ ------------------------------------------------------------------
  // Izgara (4000 hücre) yayınlanmaz; misafir izleri gelen konumlardan kendisi
  // doldurur. Ölüm kararı zaten oda sahibinde veriliyor.

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y), o.yon, o.canli ? 1 : 0]);
    }
    return { oy: oy, hz: Math.round(d.hiz), ka: Math.round(d.kalan * 10) / 10 };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    if (s.hz != null) d.hiz = s.hz;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncedenCanli = o.canli;
      if (v[0] === d.tahminKoltuk) {
        // İzi tahmin ederken zaten bıraktık. Yönü de sunucudan almıyoruz:
        // gelen yön dönüşümüzden eski olduğu için bir kare geri sarar ve
        // dönüş gözle görülür şekilde tekler.
        MG.tahmin.duzelt(o, v[1], v[2], null, d.gecikmeMs || 0);
      } else {
        // İki paket arasındaki hücreleri doldur, yoksa duvar kesik kesik çıkar
        izDoldur(d, v[0], o.x, o.y, v[1], v[2]);
        o.x = v[1]; o.y = v[2]; o.yon = v[3];
        o.cx = hucreX(o.x); o.cy = hucreY(o.y);
      }
      o.canli = v[4] === 1;
      if (oncedenCanli && !o.canli) { patlama(d, o); MG.ses.patlama(); }
    }
  }

  function izDoldur(d, koltuk, x1, y1, x2, y2) {
    var adim = L.hucre / 2;
    var dx = x2 - x1, dy = y2 - y1;
    var uz = Math.sqrt(dx * dx + dy * dy);
    if (uz > W / 2) return;             // yeni tur ya da ışınlanma
    var n = Math.max(1, Math.ceil(uz / adim));
    for (var i = 0; i <= n; i++) {
      var cx = hucreX(x1 + dx * i / n), cy = hucreY(y1 + dy * i / n);
      if (cx < 0 || cy < 0 || cx >= SUTUN || cy >= SATIR) continue;
      var ind = indeks(cx, cy);
      if (!d.izler[ind]) d.izler[ind] = koltuk + 1;
    }
  }

  function efekt(d, dt) {
    var ben = d.oyuncular[d.tahminKoltuk];
    if (ben) MG.tahmin.erit(ben, dt);
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.93; p.vy *= 0.93;
    }
    if (d.sarsinti) d.sarsinti = Math.max(0, d.sarsinti - dt);
  }

  return {
    id: 'isik',
    ad: 'Işık Duvarı',
    kurallar: 'WASD ya da oklar: yön değiştir · Duramazsın · Duvara değen elenir',
    sutun: SUTUN, satir: SATIR,
    indeks: indeks, hucreX: hucreX, hucreY: hucreY, yonler: YON,
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    tahmin: tahmin,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.isikCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
