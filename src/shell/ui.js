// Ekranlar, perde, üst bilgi çubuğu ve canvas ölçüsü.
// Burada oyun mantığı yok — sadece DOM.
MG.ui = (function () {
  var A = MG.ayar;
  var O = MG.oturum;

  function $(id) { return document.getElementById(id); }

  var cv = $('oyunCv');
  var c2d = cv.getContext('2d');

  function ekranGoster(id) {
    ['ekranGiris', 'ekranLobi', 'ekranOyun'].forEach(function (e) {
      $(e).classList.toggle('gizli', e !== id);
    });
  }

  function girisHata(m) { $('girisHata').textContent = m || ''; }

  function perdeGoster(html) {
    var p = $('perde');
    p.innerHTML = html;
    p.classList.remove('gizli');
  }

  function perdeGizle() { $('perde').classList.add('gizli'); }

  function ustBarYenile() {
    if (O.evre === 'giris' || O.evre === 'lobi') return;
    var html = '<span class="kodEtiket">Tur ' + O.turNo + '/' + O.turSayisi + '</span>';
    var d = O.oyunDurum;
    if (d && d.kalan != null) {
      var kalan = Math.max(0, Math.ceil(d.kalan));
      html += '<span class="sure' + (kalan <= 10 ? ' az' : '') + '">' +
        Math.floor(kalan / 60) + ':' + ('0' + (kalan % 60)).slice(-2) + '</span>';
    }
    for (var i = 0; i < A.oyuncuMax; i++) {
      var k = O.koltuklar[i];
      if (!k) continue;
      var olu = d && O.oyun && O.oyun.oyuncuOlu && O.oyun.oyuncuOlu(d, i);
      html += '<span class="cip' + (olu ? ' olu' : '') + '">' +
        nokta(i) + k.ad + ' <b>' + (O.skorlar[i] || 0) + '</b></span>';
    }
    $('ustBilgi').innerHTML = html;
  }

  function nokta(koltuk) {
    return '<span class="nokta" style="background:' + A.renkler[koltuk] + '"></span>';
  }

  function siraliKoltuklar() {
    var s = [];
    for (var i = 0; i < A.oyuncuMax; i++) {
      if (O.koltuklar[i]) s.push(i);
    }
    s.sort(function (a, b) { return (O.skorlar[b] || 0) - (O.skorlar[a] || 0); });
    return s;
  }

  function skorTablosu(ozet, madalya) {
    return siraliKoltuklar().map(function (k, sira) {
      var ek = ozet && ozet[k] != null
        ? '<span class="ozet">' + ozet[k] + '</span>' : '';
      var on = madalya ? '<span class="sira">' + (sira + 1) + '.</span>' : '';
      return '<div class="skorSatir">' + on + nokta(k) + O.koltuklar[k].ad +
             ek + '<b>' + (O.skorlar[k] || 0) + '</b></div>';
    }).join('');
  }

  // Tur sonu perdesi. ozet: { koltuk: 'metin' } — oyunun kendi sonuç bilgisi.
  function sonPerde(kazanan, ozet, sonTur) {
    var baslik = (kazanan != null && O.koltuklar[kazanan])
      ? '<span style="color:' + A.renkler[kazanan] + '">' +
        O.koltuklar[kazanan].ad + '</span> kazandı!'
      : 'Berabere!';
    var alt = sonTur ? 'Son tur bitti…'
                     : 'Tur ' + (O.turNo + 1) + '/' + O.turSayisi + ' başlıyor…';

    perdeGoster('<p class="turEtiket">Tur ' + O.turNo + '/' + O.turSayisi + '</p>' +
                '<h2>' + baslik + '</h2>' +
                '<div class="skorTablo">' + skorTablosu(ozet) + '</div>' +
                '<p class="alt">' + alt + '</p>');
  }

  // Seri sonu: toplam puana göre şampiyon.
  function finalPerde() {
    var s = siraliKoltuklar();
    var enYuksek = s.length ? (O.skorlar[s[0]] || 0) : 0;
    var berabere = s.length > 1 && (O.skorlar[s[1]] || 0) === enYuksek;
    var baslik = (!s.length || berabere)
      ? 'Berabere!'
      : '<span style="color:' + A.renkler[s[0]] + '">' +
        O.koltuklar[s[0]].ad + '</span> şampiyon!';

    perdeGoster('<p class="turEtiket">' + O.turSayisi + ' tur bitti</p>' +
                '<h2 class="sampiyon">' + baslik + '</h2>' +
                '<div class="skorTablo">' + skorTablosu(null, true) + '</div>' +
                '<p class="alt">Lobiye dönülüyor…</p>');
  }

  function sayimPerde(oyun, tik) {
    perdeGoster('<p class="turEtiket">Tur ' + O.turNo + '/' + O.turSayisi + '</p>' +
                '<h2>' + oyun.ad + '</h2><p class="kural">' + oyun.kurallar +
                '</p><div class="sayim">' + tik + '</div>');
  }

  function boyutlandir() {
    var oran = A.dunya.w / A.dunya.h;
    var gw = Math.min(window.innerWidth - 16, (window.innerHeight - 70) * oran);
    var gh = gw / oran;
    var dpr = window.devicePixelRatio || 1;
    cv.style.width = gw + 'px';
    cv.style.height = gh + 'px';
    cv.width = Math.round(gw * dpr);
    cv.height = Math.round(gh * dpr);
  }
  addEventListener('resize', boyutlandir);

  return {
    $: $, cv: cv, c2d: c2d, nokta: nokta,
    ekranGoster: ekranGoster,
    girisHata: girisHata,
    perdeGoster: perdeGoster,
    perdeGizle: perdeGizle,
    ustBarYenile: ustBarYenile,
    sonPerde: sonPerde,
    finalPerde: finalPerde,
    sayimPerde: sayimPerde,
    boyutlandir: boyutlandir
  };
})();
