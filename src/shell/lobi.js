// Giriş ekranı, otomatik eşleşme ve lobi.
//
// Oda kodu yoktur: "Oyna"ya basan sırayla odalara bağlanmayı dener. Açık bir
// oda bulursa katılır, bulamazsa kendisi oda sahibi olur. Kullanıcı bunların
// hiçbirini görmez.
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

  // --- giriş ---------------------------------------------------------------

  $('btnOyna').onclick = function () {
    MG.ses.ac();
    U.girisHata('');
    var ad = adAl();
    $('btnOyna').disabled = true;
    $('btnOyna').textContent = 'Bağlanılıyor…';

    MG.net.otomatikBaglan(ad, function (hata, d) {
      $('btnOyna').disabled = false;
      $('btnOyna').textContent = 'Oyna';
      if (hata) return U.girisHata(hata);
      U.girisHata('');

      if (d && d.host) {          // boş oda bulundu, sahibi biziz
        O.benKoltuk = 0;
        O.koltuklar = [];
        O.koltuklar[0] = { ad: ad, bot: false };
        O.skorlar = {};
      } else {                    // açık odaya katıldık
        O.benKoltuk = d.koltuk;
        O.koltuklar = d.koltuklar;
        O.skorlar = d.skorlar || {};
        if (d.turSayisi) O.turSayisi = d.turSayisi;
      }
      goster();
    }, function (durum) {
      U.girisHata(durum);
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

  try { $('girisAd').value = localStorage.getItem('mg_ad') || ''; } catch (e) {}
  $('girisAd').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('btnOyna').click();
  });

  // --- lobi ----------------------------------------------------------------

  function goster() {
    O.evre = 'lobi';
    O.oyunDurum = null;
    O.turNo = 0;
    MG.tur.durdur();
    U.ekranGoster('ekranLobi');

    var host = MG.net.hostMu();
    $('btnBaslat').classList.toggle('gizli', !host);
    $('btnBotEkle').classList.toggle('gizli', !host);
    $('turSecici').classList.toggle('gizli', !host);
    $('lobiBilgi').textContent = host
      ? 'Arkadaşların "Oyna" deyince buraya düşecek.'
      : 'Oda sahibinin başlatması bekleniyor…';
    ciz();
  }

  function ciz() {
    turSeciciCiz();
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
        li.innerHTML = U.nokta(i) + '<span class="bos">Bekleniyor…</span>';
      }
      ul.appendChild(li);
    }
    if (!MG.net.hostMu()) {
      var oyunAdi = O.secilenOyun && MG.oyunlar[O.secilenOyun]
        ? MG.oyunlar[O.secilenOyun].ad : 'karışık';
      $('lobiBaslik').textContent = 'Oyuncular · ' + O.turSayisi + ' tur · ' + oyunAdi;
    } else {
      $('lobiBaslik').textContent = 'Oyuncular';
    }
  }

  function botSilDugmesi(dizin) {
    var b = document.createElement('button');
    b.textContent = '✕';
    b.className = 'sil';
    b.onclick = function () { O.koltuklar[dizin] = null; degisti(); };
    return b;
  }

  // Tur sayısı seçimi: seri boyunca her tur rastgele bir oyun gelir.
  function turSeciciCiz() {
    var kutu = $('turDugmeleri');
    kutu.innerHTML = '';
    A.tur.turSecenekleri.forEach(function (n) {
      var b = document.createElement('button');
      b.textContent = n;
      b.className = 'turDugme' + (n === O.turSayisi ? ' secili' : '');
      b.onclick = function () { O.turSayisi = n; degisti(); };
      kutu.appendChild(b);
    });
    oyunSeciciCiz();
  }

  // Oyun seçimi: "Karışık" her tur farklı oyun getirir, tek oyun seçilirse
  // seri boyunca hep o oynanır — tek bir oyunu denemek için pratik.
  function oyunSeciciCiz() {
    var kutu = $('oyunDugmeleri');
    kutu.innerHTML = '';
    dugmeEkle(kutu, 'Karışık', null);
    Object.keys(MG.oyunlar).forEach(function (id) {
      dugmeEkle(kutu, MG.oyunlar[id].ad, id);
    });
  }

  function dugmeEkle(kutu, metin, id) {
    var b = document.createElement('button');
    b.textContent = metin;
    b.className = 'oyunDugme' + (O.secilenOyun === id ? ' secili' : '');
    b.onclick = function () { O.secilenOyun = id; degisti(); };
    kutu.appendChild(b);
  }

  // Oda sahibi lobide bir şey değiştirdi — herkese bildir.
  function degisti() {
    MG.net.yayinla({
      t: 'lobiDurum', koltuklar: O.koltukOzet(),
      turSayisi: O.turSayisi, secilenOyun: O.secilenOyun
    });
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

  $('btnBaslat').onclick = function () {
    if (O.oturanSayisi() < 2) {
      $('lobiBilgi').textContent = 'En az 2 oyuncu gerek — arkadaş bekle ya da bot ekle.';
      return;
    }
    MG.tur.seriBaslat();
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
