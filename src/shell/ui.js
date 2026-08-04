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
    var html = '<span class="kodEtiket">' + (MG.net.kodAl() || '') + '</span>';
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

  // Tur sonu perdesi. ozet: { koltuk: 'metin' } — oyunun kendi sonuç bilgisi.
  function sonPerde(kazanan, ozet) {
    var baslik = (kazanan != null && O.koltuklar[kazanan])
      ? '<span style="color:' + A.renkler[kazanan] + '">' +
        O.koltuklar[kazanan].ad + '</span> kazandı!'
      : 'Berabere!';

    var sirali = [];
    for (var i = 0; i < A.oyuncuMax; i++) {
      if (O.koltuklar[i]) sirali.push(i);
    }
    sirali.sort(function (a, b) { return (O.skorlar[b] || 0) - (O.skorlar[a] || 0); });

    var satirlar = sirali.map(function (k) {
      var ek = ozet && ozet[k] != null
        ? '<span class="ozet">' + ozet[k] + '</span>' : '';
      return '<div class="skorSatir">' + nokta(k) + O.koltuklar[k].ad +
             ek + '<b>' + (O.skorlar[k] || 0) + '</b></div>';
    }).join('');

    perdeGoster('<h2>' + baslik + '</h2><div class="skorTablo">' + satirlar +
                '</div><p class="alt">Yeni tur başlıyor…</p>');
  }

  function sayimPerde(oyun, tik) {
    perdeGoster('<h2>' + oyun.ad + '</h2><p class="kural">' + oyun.kurallar +
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
    sayimPerde: sayimPerde,
    boyutlandir: boyutlandir
  };
})();
