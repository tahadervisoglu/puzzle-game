// Örümcek Kaç — yerde bir örümcek var, sırtındaki fitil işliyor.
//
// Örümcek en yakın oyuncuya koşar ve yakaladığına yapışır. Fitil sıfırlanınca
// üstünde olduğu kişiyi öldürür; kimseye yapışmamışsa peşine düştüğü kişiyi.
// Sırtındaysa Boşluk'la fırlatabilirsin — ama örümcek hemen yeni bir hedef
// seçer, yani sorunu başkasına devretmiş olursun.
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.orumcek = (function () {
  var A = MG.ayar;
  var R = A.orumcek;
  var G = MG.geo;

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var h = MG.orumcekHarita.sec(rng);

    var d = {
      rng: rng,
      duvarlar: h.duvarlar,
      oyuncular: {},
      girdiler: {},
      botDurum: {},
      orumcek: {
        x: h.orumcek[0], y: h.orumcek[1], aci: Math.PI / 2,
        vx: 0, vy: 0,
        durum: 'yuruyor',   // yuruyor | yapisik | ucuyor
        sahip: -1, hedef: -1,
        sekme: 0, bacak: 0
      },
      fitil: R.fitilSn,
      fitilBoyu: R.fitilSn,
      // Izgara payı örümcek yarıçapından biraz dar: duvara sürtünen örümcek
      // kendi yol haritasının dışına düşmesin.
      izgara: MG.orumcekYol.izgaraYap(h.duvarlar, R.orumcekYaricap * 0.8),
      yolTazele: 0,
      parcalar: [],
      kalan: R.turSureSn
    };

    // Doğuş noktalarını tohumla karıştır
    var sira = h.dogumlar.map(function (_, i) { return i; });
    for (var i = sira.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = sira[i]; sira[i] = sira[j]; sira[j] = t;
    }

    var n = 0;
    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      var dog = h.dogumlar[sira[n++ % sira.length]];
      d.oyuncular[k] = {
        x: dog[0], y: dog[1],
        aci: Math.atan2(250 - dog[1], 400 - dog[0]),
        canli: true, dokunulmazlik: 0
      };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) d.botDurum[k] = { karar: 0, kacisAci: 0 };
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  function canlilar(d) {
    var l = [];
    for (var k in d.oyuncular) {
      if (d.oyuncular[k].canli) l.push(+k);
    }
    return l;
  }

  // Örümceğin hedefi: yapışabileceği en yakın oyuncu.
  function enYakinHedef(d) {
    var o = d.orumcek;
    var enIyi = -1, enAz = Infinity;
    for (var k in d.oyuncular) {
      var p = d.oyuncular[k];
      if (!p.canli || p.dokunulmazlik > 0) continue;
      var dx = p.x - o.x, dy = p.y - o.y;
      var u = dx * dx + dy * dy;
      if (u < enAz) { enAz = u; enIyi = +k; }
    }
    if (enIyi >= 0) return enIyi;
    // Herkes dokunulmazsa yine de en yakını hedefle — fitil kimseyi affetmez
    var l = canlilar(d);
    for (var i = 0; i < l.length; i++) {
      var q = d.oyuncular[l[i]];
      var ddx = q.x - o.x, ddy = q.y - o.y;
      var uu = ddx * ddx + ddy * ddy;
      if (uu < enAz) { enAz = uu; enIyi = l[i]; }
    }
    return enIyi;
  }

  // --- simülasyon (sadece oda sahibinde) ----------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.oyuncular) {
      if (!d.oyuncular[k].canli) continue;
      if (d.botDurum[k]) MG.orumcekBot.guncelle(d, +k, dt);
      insanGuncelle(d, +k, dt);
    }
    orumcekGuncelle(d, dt);
    fitilGuncelle(d, dt);
  }

  function insanGuncelle(d, koltuk, dt) {
    var p = d.oyuncular[koltuk];
    var g = d.girdiler[koltuk];
    p.dokunulmazlik = Math.max(0, p.dokunulmazlik - dt);

    var ix = (g.d ? 1 : 0) - (g.a ? 1 : 0);
    var iy = (g.s ? 1 : 0) - (g.w ? 1 : 0);
    if (ix || iy) {
      var uz = Math.sqrt(ix * ix + iy * iy);
      ix /= uz; iy /= uz;
      p.aci = Math.atan2(iy, ix);
      var hiz = R.insanHiz;
      if (d.orumcek.durum === 'yapisik' && d.orumcek.sahip === koltuk) {
        hiz *= R.yapisikYavaslatma;
      }
      G.kaydir(p, ix * hiz * dt, iy * hiz * dt, R.insanYaricap, d.duvarlar);
    }

    // Sırtındaysa Boşluk onu baktığın yöne fırlatır
    if (g.space && d.orumcek.durum === 'yapisik' && d.orumcek.sahip === koltuk) {
      firlat(d, p);
    }
  }

  function firlat(d, p) {
    var o = d.orumcek;
    o.durum = 'ucuyor';
    o.sahip = -1;
    o.sekme = 0;
    o.vx = Math.cos(p.aci) * R.firlatmaHiz;
    o.vy = Math.sin(p.aci) * R.firlatmaHiz;
    o.x = p.x + Math.cos(p.aci) * (R.insanYaricap + R.orumcekYaricap + 2);
    o.y = p.y + Math.sin(p.aci) * (R.insanYaricap + R.orumcekYaricap + 2);
    G.duvardanCikar(o, R.orumcekYaricap, d.duvarlar); // duvara bakarken fırlatılmış olabilir
    p.dokunulmazlik = R.dokunulmazlikSn;
    MG.ses.firlat();
  }

  function orumcekGuncelle(d, dt) {
    var o = d.orumcek;
    o.bacak += dt;

    if (o.durum === 'yapisik') {
      var s = d.oyuncular[o.sahip];
      if (!s || !s.canli) { o.durum = 'yuruyor'; o.sahip = -1; return; }
      o.x = s.x; o.y = s.y;
      o.hedef = o.sahip;
      return;
    }

    // Fırlatılırken duvarın içine saplanmış olabilir; kurtar.
    G.duvardanCikar(o, R.orumcekYaricap, d.duvarlar);

    if (o.durum === 'ucuyor') {
      ucusGuncelle(d, o, dt);
      return;
    }

    // yuruyor: hedefe yol haritası üzerinden git — düz çizgi karışık
    // haritada duvara dayanıp kalıyordu, örümcek kenarlardan dolaşmalı.
    o.hedef = enYakinHedef(d);
    var h = d.oyuncular[o.hedef];
    if (!h) return;

    d.yolTazele -= dt;
    if (d.yolTazele <= 0) {
      d.yolTazele = R.yolTazeleSn;
      MG.orumcekYol.akisHesapla(d.izgara, h.x, h.y);
    }

    var dx = h.x - o.x, dy = h.y - o.y;
    var uz = Math.sqrt(dx * dx + dy * dy) || 1;
    var yon;
    // Hedef görüş hattındaysa dosdoğru saldır; değilse yolu takip et
    if (uz < 260 && G.gorusTemiz(o.x, o.y, h.x, h.y, d.duvarlar, 8)) {
      yon = { x: dx / uz, y: dy / uz };
    } else {
      yon = MG.orumcekYol.yon(d.izgara, o.x, o.y) || { x: dx / uz, y: dy / uz };
    }
    o.aci = Math.atan2(yon.y, yon.x);

    // Fitilin son diliminde saldırganlaşır — yakalayamazsa kimse ölmüyor
    var hiz = R.orumcekHiz;
    if (d.fitil / d.fitilBoyu < R.panikEsigi) hiz *= R.panikHizCarpani;

    G.kaydir(o, yon.x * hiz * dt, yon.y * hiz * dt,
             R.orumcekYaricap, d.duvarlar);

    yapismaDene(d, o);
  }

  function ucusGuncelle(d, o, dt) {
    var hiz = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (hiz < R.yurumeDurmaHiz) { o.durum = 'yuruyor'; o.vx = o.vy = 0; return; }
    o.aci = Math.atan2(o.vy, o.vx);

    var adet = Math.ceil((hiz * dt) / 6);
    for (var i = 0; i < adet; i++) {
      var nx = o.x + o.vx * dt / adet;
      var ny = o.y + o.vy * dt / adet;
      var duvar = G.daireDuvarCarpar(nx, ny, R.orumcekYaricap, d.duvarlar);
      if (duvar) {
        if (o.sekme >= R.firlatmaSekme) { o.vx *= 0.3; o.vy *= 0.3; break; }
        o.sekme++;
        MG.ses.sekme();
        var mx = Math.min(Math.abs(o.x - duvar.x), Math.abs(duvar.x + duvar.w - o.x));
        var my = Math.min(Math.abs(o.y - duvar.y), Math.abs(duvar.y + duvar.h - o.y));
        if (mx < my) o.vx = -o.vx; else o.vy = -o.vy;
        break;
      }
      o.x = nx; o.y = ny;
    }

    o.vx -= o.vx * R.firlatmaSurtunme * dt;
    o.vy -= o.vy * R.firlatmaSurtunme * dt;
    yapismaDene(d, o); // uçarken de birine denk gelirse yapışır
  }

  function yapismaDene(d, o) {
    for (var k in d.oyuncular) {
      var p = d.oyuncular[k];
      if (!p.canli || p.dokunulmazlik > 0) continue;
      var dx = p.x - o.x, dy = p.y - o.y;
      var gerek = R.insanYaricap + R.orumcekYaricap;
      if (dx * dx + dy * dy > gerek * gerek) continue;
      o.durum = 'yapisik';
      o.sahip = +k;
      o.vx = o.vy = 0;
      MG.ses.yapis();
      return;
    }
  }

  function fitilGuncelle(d, dt) {
    var o = d.orumcek;

    if (d.fitil > 0) {
      d.fitil = Math.max(0, d.fitil - dt);
      if (d.fitil === 0 && o.durum !== 'yapisik') MG.ses.iska();
    }
    if (d.fitil > 0) return;

    // Fitil bittiğinde örümcek ölümcül hale gelir ve sayaç SIFIRDA BEKLER.
    // Yakaladığı ilk kişi anında patlar; sayaç ancak o zaman yeniden kurulur.
    // Kimseye yapışamadığı sürece kimse ölmez ama tehlike de geçmez.
    if (o.durum !== 'yapisik' || !d.oyuncular[o.sahip]) return;

    oldur(d, o.sahip);
    // Fitil her patlamada kısalır: oyun kendiliğinden hızlanır
    d.fitilBoyu = Math.max(R.fitilEnAz, d.fitilBoyu * R.fitilAzalma);
    d.fitil = d.fitilBoyu;
    o.durum = 'yuruyor';
    o.sahip = -1;
    o.vx = o.vy = 0;
  }

  function oldur(d, koltuk) {
    var p = d.oyuncular[koltuk];
    if (!p || !p.canli) return;
    p.canli = false;
    patlama(d, p.x, p.y);
    MG.ses.patlama();
  }

  function patlama(d, x, y) {
    for (var i = 0; i < 24; i++) {
      var a = Math.random() * Math.PI * 2;
      var h = 40 + Math.random() * 170;
      d.parcalar.push({
        x: x, y: y, vx: Math.cos(a) * h, vy: Math.sin(a) * h,
        omur: 0.4 + Math.random() * 0.5,
        renk: Math.random() < 0.5 ? '#ff9f1c' : '#444'
      });
    }
    d.sarsinti = 0.35;
  }

  // --- ağ ------------------------------------------------------------------

  var DURUMLAR = ['yuruyor', 'yapisik', 'ucuyor'];

  function anlik(d) {
    var oy = [];
    for (var k in d.oyuncular) {
      var p = d.oyuncular[k];
      oy.push([+k, Math.round(p.x), Math.round(p.y),
               Math.round(p.aci * 100) / 100, p.canli ? 1 : 0]);
    }
    var o = d.orumcek;
    return {
      oy: oy,
      or: [Math.round(o.x), Math.round(o.y), Math.round(o.aci * 100) / 100,
           DURUMLAR.indexOf(o.durum), o.sahip, o.hedef],
      fi: Math.round(d.fitil * 10) / 10,
      fb: d.fitilBoyu,
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  function uygula(d, s) {
    if (s.ka != null) d.kalan = s.ka;
    d.fitil = s.fi;
    d.fitilBoyu = s.fb;
    for (var i = 0; i < s.oy.length; i++) {
      var v = s.oy[i];
      var p = d.oyuncular[v[0]];
      if (!p) continue;
      var oncedenCanli = p.canli;
      p.x = v[1]; p.y = v[2]; p.aci = v[3]; p.canli = v[4] === 1;
      if (oncedenCanli && !p.canli) { patlama(d, p.x, p.y); MG.ses.patlama(); }
    }
    var o = d.orumcek;
    var oncekiDurum = o.durum;
    o.x = s.or[0]; o.y = s.or[1]; o.aci = s.or[2];
    o.durum = DURUMLAR[s.or[3]] || 'yuruyor';
    o.sahip = s.or[4]; o.hedef = s.or[5];
    if (oncekiDurum !== 'yapisik' && o.durum === 'yapisik') MG.ses.yapis();
    if (oncekiDurum === 'yapisik' && o.durum === 'ucuyor') MG.ses.firlat();
  }

  function efekt(d, dt) {
    d.orumcek.bacak += dt;
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
    if (d.sarsinti) d.sarsinti = Math.max(0, d.sarsinti - dt);
  }

  // --- sonuç ---------------------------------------------------------------

  function bitti(d) {
    var l = canlilar(d);
    if (l.length === 1) return { kazanan: l[0] };
    if (l.length === 0) return { kazanan: null };
    if (d.kalan <= 0) return { kazanan: null };
    return null;
  }

  function ozet(d) {
    var o = {};
    for (var k in d.oyuncular) {
      o[k] = d.oyuncular[k].canli ? 'hayatta' : 'patladı';
    }
    return o;
  }

  function oyuncuOlu(d, koltuk) {
    return !!(d.oyuncular[koltuk] && !d.oyuncular[koltuk].canli);
  }

  function oyuncuDustu(d, koltuk) {
    if (d.orumcek.sahip === koltuk) {
      d.orumcek.durum = 'yuruyor';
      d.orumcek.sahip = -1;
    }
    delete d.oyuncular[koltuk];
    delete d.botDurum[koltuk];
  }

  return {
    id: 'orumcek',
    ad: 'Örümcek Kaç',
    kurallar: 'WASD: kaç · Boşluk: sırtındaki örümceği fırlat · Fitil bitince üstündeki patlar',
    kur: kur,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: function (d, cv, c, koltuklar) { MG.orumcekCizim.ciz(d, cv, c, koltuklar); },
    bitti: bitti,
    ozet: ozet,
    oyuncuOlu: oyuncuOlu,
    oyuncuDustu: oyuncuDustu
  };
})();
