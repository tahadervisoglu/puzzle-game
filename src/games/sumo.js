// Buz Sumo — yuvarlak bir buz arenasında son kalan kazanır.
//
// Zemin buz: ivme de sürtünme de düşük, bırakınca kayarsınız. Boşluk'u
// basılı tutunca güç birikir ama ayaklarınız yere kilitlenir — odaklanırken
// yürüyemezsiniz, yalnızca nişan alırsınız. Bıraktığınızda o yöne fırlarsınız;
// havadayken WASD hâlâ çalışır, yönü biraz düzeltebilirsiniz.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.sumo = (function () {
  var A = MG.ayar;
  var S = A.sumo;
  var MERKEZ = { x: A.dunya.w / 2, y: A.dunya.h / 2 };

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var d = {
      rng: rng,
      merkez: MERKEZ,
      yaricap: S.arenaYaricap,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      izler: [],
      parcalar: [],
      elenenler: [],   // düşme sırası — tur sonu sıralaması bundan çıkar
      kalan: S.turSureSn
    };

    var oturanlar = [];
    for (var k = 0; k < koltuklar.length; k++) {
      if (koltuklar[k]) oturanlar.push(k);
    }
    // Arenaya eşit aralıklarla, hepsi merkeze dönük
    var bas = rng() * Math.PI * 2;
    for (var i = 0; i < oturanlar.length; i++) {
      var s = oturanlar[i];
      var a = bas + (i / oturanlar.length) * Math.PI * 2;
      var r = S.arenaYaricap * 0.62;
      d.oyuncular[s] = {
        x: MERKEZ.x + Math.cos(a) * r,
        y: MERKEZ.y + Math.sin(a) * r,
        vx: 0, vy: 0,
        aci: a + Math.PI,       // merkeze bak
        sarj: 0, atilma: 0,
        canli: true, dusme: 0
      };
      d.girdiler[s] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[s].bot) d.botDurum[s] = { karar: 0, hedefSarj: 0.6 };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);

    // Son dakikada arena daralır: iki kişi kaçışmaca oynayıp turu
    // kilitleyemesin.
    if (d.kalan < S.kucultmeSn) {
      var oran = S.kucultmeOran + (1 - S.kucultmeOran) * (d.kalan / S.kucultmeSn);
      d.yaricap = S.arenaYaricap * oran;
    }

    for (var k in d.oyuncular) {
      if (d.botDurum[k]) MG.sumoBot.guncelle(d, +k, dt);
      oyuncuGuncelle(d, +k, dt);
    }
    carpismalar(d);
    dusmeKontrol(d, dt);
  }

  function oyuncuGuncelle(d, koltuk, dt) {
    var o = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    if (!o.canli) return;

    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      ix /= uz; iy /= uz;
      o.aci = Math.atan2(iy, ix); // yön tuşları her hâlükârda nişan alır
    }

    if (g.space) {
      // Odaklanma: güç birikir, ayaklar yere basar. Fren ŞARJLA ORANTILI
      // artar — sabit sert fren, tam kayarken tuşa basınca oyuncuyu havada
      // çakıyor ve buz hissini tamamen öldürüyordu. Böylece kayışın
      // momentumu korunur, güç topladıkça yavaşça durursun.
      o.sarj = Math.min(1, o.sarj + S.sarjHizi * dt);
      var fren = S.sarjFren * o.sarj;
      o.vx -= o.vx * fren * dt;
      o.vy -= o.vy * fren * dt;
    } else {
      if (o.sarj > S.sarjEnAz) firla(d, o);
      o.sarj = 0;
      if (ix || iy) {
        o.vx += ix * S.ivme * dt;
        o.vy += iy * S.ivme * dt;
      }
    }

    // Buz: sürtünme düşük olduğu için durmak zaman alır
    o.vx -= o.vx * S.surtunme * dt;
    o.vy -= o.vy * S.surtunme * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;

    o.atilma = Math.max(0, o.atilma - dt);
    izBirak(d, o);
  }

  function firla(d, o) {
    var hiz = S.atilmaEnAz + (S.atilmaEnCok - S.atilmaEnAz) * o.sarj;
    o.vx += Math.cos(o.aci) * hiz;
    o.vy += Math.sin(o.aci) * hiz;
    o.atilma = 0.45;
    MG.ses.firlat();
  }

  // Eşit kütleli esnek çarpışma: hızlı gelen ötekini savurur.
  function carpismalar(d) {
    var ks = Object.keys(d.oyuncular);
    for (var i = 0; i < ks.length; i++) {
      for (var j = i + 1; j < ks.length; j++) {
        var a = d.oyuncular[ks[i]], b = d.oyuncular[ks[j]];
        if (!a.canli || !b.canli) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var uz = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var gerek = S.oyuncuYaricap * 2;
        if (uz >= gerek) continue;

        var nx = dx / uz, ny = dy / uz;
        var it = (gerek - uz) / 2;
        a.x -= nx * it; a.y -= ny * it;
        b.x += nx * it; b.y += ny * it;

        var goreceli = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (goreceli > 0) continue;   // zaten ayrılıyorlar
        var darbe = -(1 + S.esneklik) * goreceli / 2;
        a.vx -= darbe * nx; a.vy -= darbe * ny;
        b.vx += darbe * nx; b.vy += darbe * ny;

        // Şarjını harcamadan tosladıysan gücü kaybedersin
        a.sarj = b.sarj = 0;
        MG.ses.yapis();
      }
    }
  }

  function dusmeKontrol(d, dt) {
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) {
        o.dusme = Math.min(1, o.dusme + dt / S.dusmeSn);
        o.x += o.vx * dt; o.y += o.vy * dt; // kenardan kayarak çıkar
        continue;
      }
      var dx = o.x - d.merkez.x, dy = o.y - d.merkez.y;
      if (Math.sqrt(dx * dx + dy * dy) > d.yaricap) {
        o.canli = false;
        o.dusme = 0;
        if (d.elenenler.indexOf(+k) < 0) d.elenenler.push(+k);
        toz(d, o);
        MG.ses.dusme();
      }
    }
  }

  function izBirak(d, o) {
    var hiz = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (hiz < 120) return;
    d.izler.push({ x: o.x, y: o.y, aci: Math.atan2(o.vy, o.vx), omur: 1.1 });
    if (d.izler.length > 260) d.izler.shift();
  }

  function toz(d, o) {
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * Math.PI * 2;
      var h = 40 + Math.random() * 130;
      d.parcalar.push({
        x: o.x, y: o.y, vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.4
      });
    }
  }

  // --- ağ ------------------------------------------------------------------

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      oy.push([+k, Math.round(o.x), Math.round(o.y),
               Math.round(o.aci * 100) / 100,
               Math.round(o.sarj * 100) / 100, o.canli ? 1 : 0]);
    }
    return { oy: oy, ya: Math.round(d.yaricap), ka: Math.round(d.kalan * 10) / 10 };
  }

  function uygula(d, s) {
    d.uzak = true;
    if (s.ka != null) d.kalan = s.ka;
    if (s.ya != null) d.yaricap = s.ya;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var o = d.oyuncular[v[0]];
      if (!o) continue;
      var oncedenCanli = o.canli;
      var oncekiSarj = o.sarj;
      o.hx = v[1]; o.hy = v[2]; o.haci = v[3];
      if (o.ilkPaket == null) { o.x = o.hx; o.y = o.hy; o.aci = o.haci; o.ilkPaket = 1; }
      o.sarj = v[4]; o.canli = v[5] === 1;
      if (oncedenCanli && !o.canli) { o.dusme = 0; toz(d, o); MG.ses.dusme(); }
      if (oncekiSarj > S.sarjEnAz && o.sarj === 0 && o.canli) MG.ses.firlat();
    }
  }

  function uzakYumusat(d, dt) {
    var h = A.yayin.yumusatmaHizi;
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) continue;     // düşenler kendi hızlarıyla kayıyor
      MG.yumusat.nokta(o, dt, h);
      if (o.haci != null) o.aci = MG.yumusat.aci(o.aci, o.haci, dt, h);
    }
  }

  function efekt(d, dt) {
    if (d.uzak) uzakYumusat(d, dt);
    for (var i = d.izler.length - 1; i >= 0; i--) {
      d.izler[i].omur -= dt;
      if (d.izler[i].omur <= 0) d.izler.splice(i, 1);
    }
    for (i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.93; p.vy *= 0.93;
    }
    for (var k in d.oyuncular) {
      var o = d.oyuncular[k];
      if (!o.canli) o.dusme = Math.min(1, o.dusme + dt / S.dusmeSn);
    }
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

  // Ayakta kalanlar önde, düşenler geç düşenden erkene doğru.
  function siralama(d) {
    return canlilar(d).concat(d.elenenler.slice().reverse());
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) {
      o[k] = d.oyuncular[k].canli ? 'ayakta' : 'düştü';
    }
    return o;
  }

  function oyuncuOlu(d, koltuk) {
    return !!(d.oyuncular[koltuk] && !d.oyuncular[koltuk].canli);
  }

  function oyuncuDustu(d, koltuk) {
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  return {
    id: 'sumo',
    ad: 'Buz Sumo',
    kurallar: 'Boşluk basılı: güç topla · Bırak: fırla · WASD ya da oklar: nişan ve yön · Düşen elenir',
    kur: kur,
    siralama: siralama,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar, benKoltuk) {
      MG.sumoCizim.ciz(d, cv, c, koltuklar, benKoltuk);
    },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
