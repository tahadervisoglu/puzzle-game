// Giriş ekranı, oda kurma/katılma, lobi listesi ve oyun seçimi.
MG.lobi = (function () {
  var A = MG.ayar;
  var O = MG.oturum;
  var U = MG.ui;
  var $ = U.$;

  function adAl() {
    var ad = $('girisAd').value.trim().slice(0, 12) || 'Oyuncu';
    try { localStorage.setItem('mg_ad', ad); } catch (e) {}
    return ad;
  }

  // --- giriş ekranı --------------------------------------------------------

  $('btnOdaKur').onclick = function () {
    MG.ses.ac();
    U.girisHata('');
    var ad = adAl();
    $('btnOdaKur').disabled = true;
    MG.net.odaKur(function (hata) {
      $('btnOdaKur').disabled = false;
      if (hata) return U.girisHata(hata);
      O.benKoltuk = 0;
      O.koltuklar = [];
      O.koltuklar[0] = { ad: ad, bot: false };
      O.skorlar = {};
      goster();
    });
  };

  $('btnKatil').onclick = function () {
    MG.ses.ac();
    U.girisHata('');
    var kod = $('girisKod').value.trim();
    if (kod.length !== 4) return U.girisHata('4 karakterlik oda kodunu gir.');
    $('btnKatil').disabled = true;
    U.girisHata('Bağlanılıyor…');
    MG.net.katil(kod, adAl(), function (hata, d) {
      $('btnKatil').disabled = false;
      if (hata) return U.girisHata(hata);
      U.girisHata('');
      O.benKoltuk = d.koltuk;
      O.koltuklar = d.koltuklar;
      O.skorlar = d.skorlar || {};
      O.secilenOyun = d.oyun || 'tank';
      goster();
    });
  };

  $('btnBagTest').onclick = function () {
    MG.ses.ac();
    var kutu = $('bagTestSonuc');
    kutu.classList.remove('gizli');
    kutu.textContent = 'Adaylar toplanıyor… (~8 sn)';
    MG.bagTest(function (hata, s) {
      if (hata) return void (kutu.textContent = hata);
      kutu.textContent =
        'Kendi adresim (host)   : ' + (s.host ? 'var' : 'YOK') + '\n' +
        'Dış adresim (STUN)     : ' + (s.stun ? 'çalışıyor' : 'ÇALIŞMIYOR') + '\n' +
        'Aktarıcı (TURN)        : ' + (s.turn ? 'çalışıyor' : 'ÇALIŞMIYOR') +
        (s.turn ? '\n\nHer şey yolunda, arkadaşların bağlanabilir.'
                : '\n\nTURN çalışmıyor — çoğu arkadaşın BAĞLANAMAZ.');
    });
  };

  // Davet linkiyle gelindiyse kodu doldur
  (function () {
    var oda = new URLSearchParams(location.search).get('oda');
    if (oda) $('girisKod').value = oda.toUpperCase();
    try { $('girisAd').value = localStorage.getItem('mg_ad') || ''; } catch (e) {}
  })();

  // --- lobi ----------------------------------------------------------------

  function goster() {
    O.evre = 'lobi';
    O.oyunDurum = null;
    MG.tur.durdur();
    U.ekranGoster('ekranLobi');
    $('lobiKod').textContent = MG.net.kodAl() || '';
    var host = MG.net.hostMu();
    $('btnBaslat').classList.toggle('gizli', !host);
    $('btnBotEkle').classList.toggle('gizli', !host);
    $('lobiBilgi').textContent = host
      ? 'Davet linkini gönder, herkes gelince Başlat.'
      : 'Oda sahibinin başlatması bekleniyor…';
    ciz();
  }

  function ciz() {
    oyunSeciciCiz();
    var ul = $('lobiListe');
    ul.innerHTML = '';
    var host = MG.net.hostMu();
    for (var i = 0; i < A.oyuncuMax; i++) {
      var li = document.createElement('li');
      var k = O.koltuklar[i];
      if (k) {
        li.innerHTML = U.nokta(i) + '<span>' + k.ad +
          (i === 0 ? ' <em>(oda sahibi)</em>' : '') +
          (i === O.benKoltuk && !k.bot ? ' <em>(sen)</em>' : '') + '</span>';
        if (host && k.bot) li.appendChild(botSilDugmesi(i));
      } else {
        li.innerHTML = U.nokta(i) + '<span class="bos">Boş</span>';
      }
      ul.appendChild(li);
    }
  }

  function botSilDugmesi(dizin) {
    var b = document.createElement('button');
    b.textContent = '✕';
    b.className = 'sil';
    b.onclick = function () { O.koltuklar[dizin] = null; degisti(); };
    return b;
  }

  function oyunSeciciCiz() {
    var kutu = $('oyunSecici');
    kutu.innerHTML = '';
    var host = MG.net.hostMu();
    Object.keys(MG.oyunlar).forEach(function (id) {
      var b = document.createElement('button');
      b.textContent = MG.oyunlar[id].ad;
      b.className = 'oyunDugme' + (id === O.secilenOyun ? ' secili' : '');
      b.disabled = !host;
      b.onclick = function () { O.secilenOyun = id; degisti(); };
      kutu.appendChild(b);
    });
  }

  // Oda sahibi lobide bir şey değiştirdi — herkese bildir.
  function degisti() {
    MG.net.yayinla({ t: 'lobiDurum', koltuklar: O.koltukOzet(), oyun: O.secilenOyun });
    ciz();
  }

  $('btnBotEkle').onclick = function () {
    for (var i = 0; i < A.oyuncuMax; i++) {
      if (!O.koltuklar[i]) {
        O.koltuklar[i] = { ad: 'Bot ' + 'ABCDE'[i], bot: true };
        return degisti();
      }
    }
  };

  $('btnDavet').onclick = function () {
    var url = location.origin + location.pathname + '?oda=' + MG.net.kodAl();
    var dugme = $('btnDavet');
    var eski = dugme.textContent;
    function bitti() {
      dugme.textContent = 'Kopyalandı ✓';
      setTimeout(function () { dugme.textContent = eski; }, 1500);
    }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(bitti, function () {
      window.prompt('Davet linki:', url);
    });
    else window.prompt('Davet linki:', url);
  };

  $('btnBaslat').onclick = function () {
    if (O.oturanSayisi() < 2) {
      $('lobiBilgi').textContent = 'En az 2 oyuncu gerek — arkadaş bekle ya da bot ekle.';
      return;
    }
    MG.tur.baslat();
  };

  $('btnAyril').onclick = ayril;

  function ayril() {
    MG.net.ayril();
    MG.tur.durdur();
    O.sifirla();
    U.ekranGoster('ekranGiris');
  }

  return { goster: goster, ciz: ciz, degisti: degisti, ayril: ayril };
})();
