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
    U.girisHata('Sunucuya bağlanılıyor… (uykudaysa bir dakika sürebilir)');

    MG.net.baglan(ad, function (hata, d) {
      $('btnOyna').disabled = false;
      $('btnOyna').textContent = 'Oyna';
      if (hata) return U.girisHata(hata);
      U.girisHata('');

      O.benKoltuk = d.koltuk;
      O.koltuklar = d.koltuklar;
      O.skorlar = d.skorlar || {};
      if (d.turSayisi) O.turSayisi = d.turSayisi;
      if ('secilenOyun' in d) O.secilenOyun = d.secilenOyun;
      goster();
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

    var sahip = MG.net.sahipMiyim();
    $('btnBaslat').classList.toggle('gizli', !sahip);
    $('btnBotEkle').classList.toggle('gizli', !sahip);
    $('turSecici').classList.toggle('gizli', !sahip);
    $('lobiBilgi').textContent = sahip
      ? 'Arkadaşların "Oyna" deyince buraya düşecek.'
      : 'Oda sahibinin başlatması bekleniyor…';
    ciz();
  }

  function ciz() {
    turSeciciCiz();
    var ul = $('lobiListe');
    ul.innerHTML = '';
    var sahip = MG.net.sahipMiyim();
    for (var i = 0; i < A.oyuncuMax; i++) {
      var li = document.createElement('li');
      var k = O.koltuklar[i];
      if (k) {
        li.innerHTML = U.nokta(i) + '<span>' + k.ad +
          (i === 0 ? ' <em>(oda sahibi)</em>' : '') +
          (i === O.benKoltuk && !k.bot ? ' <em>(sen)</em>' : '') + '</span>';
        if (sahip && k.bot) li.appendChild(botSilDugmesi(i));
      } else {
        li.innerHTML = U.nokta(i) + '<span class="bos">Bekleniyor…</span>';
      }
      ul.appendChild(li);
    }
    if (!MG.net.sahipMiyim()) {
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
    b.onclick = function () { MG.net.gonder({ t: 'botSil', koltuk: dizin }); };
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
      b.onclick = function () { ayarYolla(n, O.secilenOyun); };
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
    b.onclick = function () { ayarYolla(O.turSayisi, id); };
    kutu.appendChild(b);
  }

  // Lobi kararları sunucuya gider; herkese dağıtmayı o üstlenir. Yerel durum
  // da hemen güncellenir: yalnızca sunucunun cevabını beklersek arka arkaya
  // yapılan iki tıklamada ikincisi henüz güncellenmemiş eski değeri geri
  // gönderip birincisini eziyordu. Sunucu farklı karar verirse lobiDurum
  // mesajıyla zaten düzeltiyor.
  function ayarYolla(turSayisi, secilenOyun) {
    O.turSayisi = turSayisi;
    O.secilenOyun = secilenOyun;
    ciz();
    MG.net.gonder({ t: 'ayar', turSayisi: turSayisi, secilenOyun: secilenOyun });
  }

  $('btnBotEkle').onclick = function () {
    MG.net.gonder({ t: 'bot' });
  };

  $('btnBaslat').onclick = function () {
    if (O.oturanSayisi() < 2) {
      $('lobiBilgi').textContent = 'En az 2 oyuncu gerek — arkadaş bekle ya da bot ekle.';
      return;
    }
    MG.net.gonder({ t: 'basla' });
  };

  $('btnAyril').onclick = ayril;

  function ayril() {
    MG.net.ayril();
    MG.tur.durdur();
    O.sifirla();
    U.ekranGoster('ekranGiris');
  }

  return { goster: goster, ciz: ciz, ayril: ayril };
})();
