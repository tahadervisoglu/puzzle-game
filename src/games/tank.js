// Tank Düellosu — minigame sözleşmesi:
//   kur(tohum, koltuklar)        tohumdan dünyayı kurar (her istemcide aynı)
//   girdi(d, koltuk, tus, basili) tuş durumu işler (sadece hostta anlamlı)
//   guncelle(d, dt)              dünya simülasyonu — SADECE oda sahibinde çalışır
//   anlik(d)                     yayınlanacak durum
//   uygula(d, s)                 misafirde gelen durumu uygular
//   efekt(d, dt)                 görsel efektler — her istemcide çalışır
//   ciz(d, cv, c, koltuklar)     çizim — her istemcide
//   bitti(d)                     null | { kazanan: koltuk | null }
MG.oyunlar = MG.oyunlar || {};

MG.oyunlar.tank = (function () {
  var A = MG.ayar;
  var G = MG.geo;
  var W = A.dunya.w, H = A.dunya.h;
  var KAL = G.KAL;

  // --- haritalar -----------------------------------------------------------
  // Elle çizilmiş sabit haritalar; 800x500 mantıksal alanda duvar dikdörtgenleri
  // ve 5 doğuş noktası. Dış çerçeve otomatik eklenir.
  var HARITALAR = [
    { // resimdeki düzen: sağ üstte kapılı oda, solda ve altta kısa duvarlar
      duvarlar: [
        { x: 500, y: 0, w: KAL, h: 180 },
        { x: 560, y: 180, w: 240, h: KAL },
        { x: 0, y: 230, w: 150, h: KAL },
        { x: 250, y: 140, w: 130, h: KAL },
        { x: 320, y: 350, w: KAL, h: 150 }
      ],
      dogumlar: [[70, 70], [720, 90], [70, 430], [720, 430], [420, 260]]
    },
    { // merkez artı, köşelerde kısa siperler
      duvarlar: [
        { x: 394, y: 130, w: KAL, h: 240 },
        { x: 280, y: 244, w: 240, h: KAL },
        { x: 120, y: 100, w: 110, h: KAL },
        { x: 570, y: 100, w: 110, h: KAL },
        { x: 120, y: 388, w: 110, h: KAL },
        { x: 570, y: 388, w: 110, h: KAL }
      ],
      dogumlar: [[60, 60], [740, 60], [60, 440], [740, 440], [400, 60]]
    },
    { // kaydırılmış odacıklar
      duvarlar: [
        { x: 0, y: 160, w: 210, h: KAL },
        { x: 590, y: 328, w: 210, h: KAL },
        { x: 260, y: 0, w: KAL, h: 120 },
        { x: 528, y: 380, w: KAL, h: 120 },
        { x: 330, y: 244, w: 140, h: KAL },
        { x: 640, y: 80, w: KAL, h: 100 },
        { x: 150, y: 320, w: KAL, h: 100 }
      ],
      dogumlar: [[70, 70], [730, 70], [70, 430], [730, 430], [400, 130]]
    }
  ];

  function daireDuvarCarpar(x, y, r, d) { return G.daireDuvarCarpar(x, y, r, d); }
  function noktaDuvarda(x, y, d) { return G.noktaDuvarda(x, y, d); }
  function aciNormalle(a) { return G.aciNormalle(a); }
  function gorusTemiz(x1, y1, x2, y2, d) {
    return G.gorusTemiz(x1, y1, x2, y2, d, A.bot.gorusAdim);
  }

  // --- kurulum -------------------------------------------------------------

  function kur(tohum, koltuklar) {
    var rng = MG.rngYap(tohum);
    var h = HARITALAR[Math.floor(rng() * HARITALAR.length)];
    var duvarlar = G.cerceve().concat(h.duvarlar);

    // Doğuş noktalarını tohumla karıştır, oturan koltuklara sırayla dağıt
    var sira = h.dogumlar.map(function (_, i) { return i; });
    for (var i = sira.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = sira[i]; sira[i] = sira[j]; sira[j] = tmp;
    }

    var d = {
      rng: rng,
      duvarlar: duvarlar,
      tanklar: {},
      girdiler: {},
      mermiler: [],
      parcalar: [],
      botDurum: {},
      oyuncuSayisi: 0,
      elenenler: [],   // elenme sırası — tur sonu sıralaması bundan çıkar
      kalan: A.tank.turSureSn
    };

    var s = 0;
    for (var k = 0; k < koltuklar.length; k++) {
      if (!koltuklar[k]) continue;
      var dog = h.dogumlar[sira[s % sira.length]];
      s++;
      d.oyuncuSayisi++;
      d.tanklar[k] = {
        x: dog[0], y: dog[1],
        aci: Math.atan2(H / 2 - dog[1], W / 2 - dog[0]), // merkeze dönük başla
        canli: true,
        bekleme: 0
      };
      d.girdiler[k] = { w: false, a: false, s: false, d: false, space: false };
      if (koltuklar[k].bot) {
        d.botDurum[k] = {
          karar: rng() * A.bot.kararSn, don: 1,
          sonX: dog[0], sonY: dog[1], kurtul: 0
        };
      }
    }
    return d;
  }

  function girdi(d, koltuk, tus, basili) {
    var g = d.girdiler[koltuk];
    if (g && tus in g) g[tus] = !!basili;
  }

  // --- simülasyon (sadece hostta) -----------------------------------------

  function guncelle(d, dt) {
    d.kalan = Math.max(0, d.kalan - dt);
    for (var k in d.tanklar) {
      var t = d.tanklar[k];
      if (!t.canli) continue;
      if (d.botDurum[k]) botGuncelle(d, +k, dt);
      tankGuncelle(d, +k, t, dt);
    }
    mermileriGuncelle(d, dt);
  }

  function tankGuncelle(d, koltuk, t, dt) {
    var g = d.girdiler[koltuk];
    var R = A.tank.yaricap;

    t.aci = aciNormalle(t.aci + ((g.d ? 1 : 0) - (g.a ? 1 : 0)) * A.tank.donusHiz * dt);

    var v = g.w ? A.tank.hiz : (g.s ? -A.tank.geriHiz : 0);
    if (v) {
      // Eksenleri ayrı ayrı ilerlet: duvara sürtünerek kaymak mümkün olsun
      var nx = t.x + Math.cos(t.aci) * v * dt;
      if (!daireDuvarCarpar(nx, t.y, R, d.duvarlar)) t.x = nx;
      var ny = t.y + Math.sin(t.aci) * v * dt;
      if (!daireDuvarCarpar(t.x, ny, R, d.duvarlar)) t.y = ny;
    }

    t.bekleme = Math.max(0, t.bekleme - dt);
    if (g.space && t.bekleme <= 0 && aktifMermi(d, koltuk) < A.mermi.maxAktif) {
      var namlu = R + 8;
      d.mermiler.push({
        x: t.x + Math.cos(t.aci) * namlu,
        y: t.y + Math.sin(t.aci) * namlu,
        vx: Math.cos(t.aci) * A.mermi.hiz,
        vy: Math.sin(t.aci) * A.mermi.hiz,
        sahip: koltuk,
        yas: 0,
        sekme: 0
      });
      t.bekleme = A.mermi.beklemeSn;
      MG.ses.ates();
    }
  }

  function aktifMermi(d, koltuk) {
    var n = 0;
    for (var i = 0; i < d.mermiler.length; i++) {
      if (d.mermiler[i].sahip === koltuk) n++;
    }
    return n;
  }

  function mermileriGuncelle(d, dt) {
    var R = A.mermi.yaricap;
    for (var i = d.mermiler.length - 1; i >= 0; i--) {
      var m = d.mermiler[i];
      m.yas += dt;
      if (m.yas > A.mermi.omurSn) { d.mermiler.splice(i, 1); continue; }

      // Hızlı mermi duvardan tünellemesin diye küçük adımlarla ilerlet
      var adimSayisi = Math.ceil((A.mermi.hiz * dt) / 5);
      var oldu = false;
      for (var a = 0; a < adimSayisi && !oldu; a++) {
        m.x += m.vx * dt / adimSayisi;
        m.y += m.vy * dt / adimSayisi;

        var duvar = daireDuvarCarpar(m.x, m.y, R, d.duvarlar);
        if (duvar) {
          if (m.sekme >= A.mermi.sekmeMax) { oldu = true; break; }
          m.sekme++;
          MG.ses.sekme();
          // Hangi eksende az gömüldüyse o eksende yansıt
          var mx = Math.min(Math.abs(m.x - duvar.x), Math.abs(duvar.x + duvar.w - m.x));
          var my = Math.min(Math.abs(m.y - duvar.y), Math.abs(duvar.y + duvar.h - m.y));
          if (mx < my) { m.vx = -m.vx; m.x += m.vx > 0 ? mx + R : -(mx + R); }
          else { m.vy = -m.vy; m.y += m.vy > 0 ? my + R : -(my + R); }
        }

        for (var k in d.tanklar) {
          var t = d.tanklar[k];
          if (!t.canli) continue;
          if (+k === m.sahip && m.yas < A.mermi.sahipKorumaSn) continue;
          var dx = t.x - m.x, dy = t.y - m.y;
          var rr = A.tank.yaricap + R;
          if (dx * dx + dy * dy < rr * rr) {
            tankOldur(d, +k, t);
            oldu = true;
            break;
          }
        }
      }
      if (oldu) d.mermiler.splice(i, 1);
    }
  }

  function tankOldur(d, koltuk, t) {
    t.canli = false;
    if (d.elenenler.indexOf(koltuk) < 0) d.elenenler.push(koltuk);
    patlamaEfekti(d, t.x, t.y);
    MG.ses.patlama();
  }

  // Hayatta kalanlar önde, elenenler geç elenenden erkene doğru.
  function siralama(d) {
    var canli = [];
    for (var k in d.tanklar) {
      if (d.tanklar[k].canli) canli.push(+k);
    }
    return canli.concat(d.elenenler.slice().reverse());
  }

  // --- bot yapay zekâsı (sadece hostta çalışır — sahiplik kuralı) ---------

  function botGuncelle(d, koltuk, dt) {
    var b = d.botDurum[koltuk];
    var t = d.tanklar[koltuk];
    var g = d.girdiler[koltuk];

    b.karar -= dt;
    if (b.karar <= 0) {
      b.karar = A.bot.kararSn;

      // Takılma tespiti: son karar aralığında neredeyse hiç ilerlemediyse
      // duvara dayanmış demektir. Kurtulma moduna geç, yoksa iki bot
      // duvarın iki yanında birbirine dönük sonsuza kadar bekler.
      var gx = t.x - b.sonX, gy = t.y - b.sonY;
      if (b.kurtul <= 0 && gx * gx + gy * gy < A.bot.takilmaPx * A.bot.takilmaPx) {
        b.kurtul = A.bot.kurtulmaSn;
        b.don = d.rng() < 0.5 ? 1 : -1;
      }
      b.sonX = t.x; b.sonY = t.y;

      b.hedef = null;
      var enYakin = Infinity;
      for (var k in d.tanklar) {
        if (+k === koltuk || !d.tanklar[k].canli) continue;
        var dx = d.tanklar[k].x - t.x, dy = d.tanklar[k].y - t.y;
        var uz = dx * dx + dy * dy;
        if (uz < enYakin) { enYakin = uz; b.hedef = +k; }
      }
    }

    g.w = g.a = g.d = g.s = g.space = false;

    var onX = t.x + Math.cos(t.aci) * 42;
    var onY = t.y + Math.sin(t.aci) * 42;
    var onuKapali = noktaDuvarda(onX, onY, d.duvarlar);

    if (b.kurtul > 0) {
      // Kurtulma: hedefi boş ver, dönerken ilerlemeyi sürdür — tank duvara
      // sürtünerek kayar ve köşeden çıkar.
      b.kurtul -= dt;
      if (b.don > 0) g.d = true; else g.a = true;
      g.w = !onuKapali;
      g.s = onuKapali;
      return;
    }

    if (b.hedef != null && d.tanklar[b.hedef] && d.tanklar[b.hedef].canli) {
      var h = d.tanklar[b.hedef];
      var gorus = gorusTemiz(t.x, t.y, h.x, h.y, d.duvarlar);
      var istenen = Math.atan2(h.y - t.y, h.x - t.x);
      var fark = aciNormalle(istenen - t.aci);
      if (fark > 0.06) g.d = true;
      else if (fark < -0.06) g.a = true;
      if (gorus && Math.abs(fark) < A.bot.atisAciEsigi) g.space = true;
      if (Math.abs(fark) < 1.2) g.w = true;
    } else {
      g.w = true; // hedef yok: dolaş
    }

    if (onuKapali) {
      // Duvara dayandı: dönmeyi sürdür ama ilerlemeyi büsbütün kesme,
      // yoksa aynı noktada salınıp kalır.
      if (b.don > 0) g.d = true; else g.a = true;
      g.w = false;
    }
  }

  // --- ağ: anlık görüntü ---------------------------------------------------

  function anlik(d) {
    var ta = [];
    for (var k in d.tanklar) {
      var t = d.tanklar[k];
      ta.push([+k, Math.round(t.x), Math.round(t.y),
               Math.round(t.aci * 100) / 100, t.canli ? 1 : 0]);
    }
    return {
      ta: ta,
      // Mermi hızı da gider: misafir paketler arasında onu ileri taşır,
      // yoksa mermiler ekranda kesik kesik zıplar.
      me: d.mermiler.map(function (m) {
        return [Math.round(m.x), Math.round(m.y), Math.round(m.vx), Math.round(m.vy)];
      }),
      ka: Math.round(d.kalan * 10) / 10
    };
  }

  // Misafir hiçbir şeyi simüle etmez; gelen durumu uygular, ölüm ve ateş
  // anlarını farktan yakalayıp efekt/ses üretir.
  // Misafir: gelen değerler hedef olarak saklanır, efekt() onlara doğru
  // yumuşatır. Doğrudan yazmak nesneleri sıçratıyordu.
  function uygula(d, s) {
    d.uzak = true;
    var oncekiMermi = d.mermiler.length;
    if (s.ka != null) d.kalan = s.ka;
    for (var i = 0; i < s.ta.length; i++) {
      var v = s.ta[i];
      var t = d.tanklar[v[0]];
      if (!t) continue;
      var oncedenCanli = t.canli;
      t.hx = v[1]; t.hy = v[2]; t.haci = v[3];
      if (t.ilkPaket == null) { t.x = t.hx; t.y = t.hy; t.aci = t.haci; t.ilkPaket = 1; }
      t.canli = v[4] === 1;
      if (oncedenCanli && !t.canli) {
        patlamaEfekti(d, t.x, t.y);
        MG.ses.patlama();
      }
    }
    d.mermiler = s.me.map(function (m) {
      return { x: m[0], y: m[1], vx: m[2] || 0, vy: m[3] || 0,
               sahip: -1, yas: 1, sekme: 0 };
    });
    if (d.mermiler.length > oncekiMermi) MG.ses.ates();
  }

  function uzakYumusat(d, dt) {
    var A2 = A.yayin;
    for (var k in d.tanklar) {
      var t = d.tanklar[k];
      if (t.hx == null) continue;
      MG.yumusat.nokta(t, dt, A2.yumusatmaHizi);
      t.aci = MG.yumusat.aci(t.aci, t.haci, dt, A2.yumusatmaHizi);
    }
    // Mermiler kimlik taşımadığı için eşleştirilemez; gelen hızla ileri
    // taşınırlar, sonraki paket konumu düzeltir.
    for (var i = 0; i < d.mermiler.length; i++) {
      var m = d.mermiler[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
  }

  // --- efektler (her istemcide) -------------------------------------------

  function patlamaEfekti(d, x, y) {
    for (var i = 0; i < 26; i++) {
      var aci = Math.random() * Math.PI * 2;
      var hiz = 40 + Math.random() * 160;
      d.parcalar.push({
        x: x, y: y,
        vx: Math.cos(aci) * hiz, vy: Math.sin(aci) * hiz,
        omur: 0.4 + Math.random() * 0.5,
        renk: Math.random() < 0.5 ? '#ff9f1c' : '#555'
      });
    }
    d.sarsinti = 0.3;
  }

  function efekt(d, dt) {
    if (d.uzak) uzakYumusat(d, dt);
    for (var i = d.parcalar.length - 1; i >= 0; i--) {
      var p = d.parcalar[i];
      p.omur -= dt;
      if (p.omur <= 0) { d.parcalar.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
    }
    if (d.sarsinti) d.sarsinti = Math.max(0, d.sarsinti - dt);
  }

  // --- çizim ---------------------------------------------------------------

  function ciz(d, cv, c, koltuklar, benKoltuk) {
    var olcek = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.save();
    c.scale(olcek, olcek);
    if (d.sarsinti) {
      c.translate((Math.random() - 0.5) * d.sarsinti * 14,
                  (Math.random() - 0.5) * d.sarsinti * 14);
    }

    MG.cizimYardim.zeminDoku(c, W, H, '#e9eef2', '#d3dde4', 'rgba(0,0,0,0.04)');

    c.fillStyle = '#44515c';
    for (var i = 0; i < d.duvarlar.length; i++) {
      var dv = d.duvarlar[i];
      c.fillRect(dv.x, dv.y, dv.w, dv.h);
    }

    c.fillStyle = '#222';
    for (i = 0; i < d.mermiler.length; i++) {
      var m = d.mermiler[i];
      c.beginPath();
      c.arc(m.x, m.y, A.mermi.yaricap, 0, Math.PI * 2);
      c.fill();
    }

    for (var k in d.tanklar) {
      tankCiz(c, d.tanklar[k], A.renkler[+k],
              koltuklar[+k] ? koltuklar[+k].ad : '');
    }

    var ben = d.tanklar[benKoltuk];
    if (ben && ben.canli) {
      MG.cizimYardim.benIsareti(c, ben.x, ben.y - 34, A.renkler[benKoltuk]);
    }

    for (i = 0; i < d.parcalar.length; i++) {
      var p = d.parcalar[i];
      c.globalAlpha = Math.min(1, p.omur * 2);
      c.fillStyle = p.renk;
      c.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    c.globalAlpha = 1;
    c.restore();
  }

  function tankCiz(c, t, renk, ad) {
    c.save();
    c.translate(t.x, t.y);
    if (!t.canli) {
      // enkaz: soluk gövde + çarpı
      c.rotate(t.aci);
      c.globalAlpha = 0.35;
      c.fillStyle = '#888';
      c.fillRect(-16, -12, 32, 24);
      c.globalAlpha = 1;
      c.strokeStyle = '#666';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-9, -9); c.lineTo(9, 9);
      c.moveTo(9, -9); c.lineTo(-9, 9);
      c.stroke();
      c.restore();
      return;
    }
    c.rotate(t.aci);
    c.fillStyle = '#2a2a2a'; // paletler
    c.fillRect(-16, -14, 32, 6);
    c.fillRect(-16, 8, 32, 6);
    c.fillStyle = renk;      // gövde
    c.fillRect(-14, -10, 28, 20);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 2;
    c.strokeRect(-14, -10, 28, 20);
    c.fillStyle = 'rgba(0,0,0,0.3)'; // namlu
    c.fillRect(6, -3, 18, 6);
    c.beginPath();               // taret
    c.arc(0, 0, 7, 0, Math.PI * 2);
    c.fill();
    c.restore();

    if (ad) {
      c.save();
      c.translate(t.x, t.y);
      c.font = '11px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillText(ad, 0, -24);
      c.restore();
    }
  }

  // --- tur sonu ------------------------------------------------------------

  function bitti(d) {
    if (d.oyuncuSayisi < 2) return null;
    var canlilar = [];
    for (var k in d.tanklar) {
      if (d.tanklar[k].canli) canlilar.push(+k);
    }
    if (canlilar.length === 1) return { kazanan: canlilar[0] };
    if (canlilar.length === 0) return { kazanan: null };
    // Kimse kimseyi bulamadan süre dolduysa tur berabere biter — yoksa
    // iki oyuncu saklandığında tur hiç bitmez.
    if (d.kalan <= 0) return { kazanan: null };
    return null;
  }

  // Bağlantısı kopan oyuncunun tankı ölür — yoksa tur hiç bitmez.
  function oyuncuDustu(d, koltuk) {
    if (d.tanklar[koltuk]) d.tanklar[koltuk].canli = false;
  }

  function oyuncuOlu(d, koltuk) {
    return !!(d.tanklar[koltuk] && !d.tanklar[koltuk].canli);
  }

  return {
    id: 'tank',
    ad: 'Tank Düellosu',
    kurallar: 'WASD ya da ok tuşları: hareket · Boşluk: ateş · Son kalan kazanır',
    kur: kur,
    siralama: siralama,
    oyuncuDustu: oyuncuDustu,
    oyuncuOlu: oyuncuOlu,
    girdi: girdi,
    guncelle: guncelle,
    anlik: anlik,
    uygula: uygula,
    efekt: efekt,
    ciz: ciz,
    bitti: bitti,
    ozet: null
  };
})();
