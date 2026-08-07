window.MG = window.MG || {};

// Tüm denge ve ağ ayarları burada durur.
// Kod bilmeden buradan oynayarak ayar yapılabilir (README: denge sayıları tek dosyada).
MG.ayar = {
  oyuncuMax: 5,

  // Mantıksal dünya boyutu. Çizim her ekranda buna oranlanır,
  // ağda da bu koordinatlar gider — makineler arası fark oluşmaz.
  dunya: { w: 800, h: 500 },

  tank: {
    hiz: 150,          // px/sn ileri
    geriHiz: 95,       // px/sn geri
    donusHiz: 3.6,     // radyan/sn — tank yerinde döner
    yaricap: 15,
    turSureSn: 90      // kimse kimseyi bulamazsa tur burada biter
  },

  forklift: {
    hiz: 135,          // px/sn ileri
    geriHiz: 90,
    ivme: 420,         // px/sn² — ağır araç hissi
    donusHiz: 2.9,     // radyan/sn, TAM HIZDA. Forklift yerinde dönemez:
                       // dönüş miktarı o anki hızla çarpılır (araç gibi).
    yaricap: 17,
    catalUzak: 30,     // gövde merkezinden çatal ucuna
    almaMesafe: 24,    // çatal ucu kutu merkezine bu kadar yakınsa alır
    kutuSayisi: 10,
    kutuBoy: 26,
    alanYw: 58,        // oyuncu alanı yarı genişlik
    alanYh: 42,        // yarı yükseklik
    turSureSn: 30
  },

  mermi: {
    hiz: 280,
    yaricap: 4,
    omurSn: 6,          // bu süre sonunda kendiliğinden söner
    sekmeMax: 2,        // duvardan kaç kez seker
    beklemeSn: 0.6,     // iki atış arası
    maxAktif: 3,        // bir tankın aynı anda havada tutabileceği mermi
    sahipKorumaSn: 0.15 // atan tank kendi mermisinden bu kadar süre korunur
  },

  yaris: {
    turSayisi: 2,
    turSureSn: 100,     // kimse bitiremezse tur burada kapanır
    maxHiz: 540,        // px/sn — bu oyun hızlı olsun, tank gibi kasmasın
    ivme: 430,
    frenIvme: 720,
    geriMaxHiz: 170,
    surtunme: 0.5,      // gaz yokken yavaşlama (oran/sn)
    donusHiz: 3.4,      // rad/sn, tam direksiyonda
    donusHizEsigi: 0.3, // bu hız oranının altında direksiyon zayıflar
    driftSonum: 0.86,   // yanal hız sönümü — düşük değer = daha çok kayma
    cimMaxHiz: 200,     // çimde hız sınırı
    cimSurtunme: 2.4,
    yaricap: 13,
    pistGenislik: 155,
    kameraZoom: 1.45,
    lastikSayisi: 18,
    lastikYaricap: 15,
    lastikYavaslatma: 0.55, // çarpınca hız bu oranla çarpılır
    lastikItme: 0.85,       // darbenin lastiğe geçen payı
    lastikSurtunme: 3.2,    // savrulan lastik böyle yavaşlar
    lastikGeriDonus: 0.55,  // yavaşça eski yerine döner, pist boşalmasın
    lastikKaydirma: 46      // bariyere yaslanan aracı kenardan sıyıran itiş
  },

  yokus: {
    turSureSn: 30,
    // Yan görünüm: yamaç sol üstten sağ alta iner. Yatay kontrol yok,
    // tek eylem zıplamak. Oyunun kalbi oyuncuların çarpışması:
    // birbirini iter, üstüne biner, önünü keser.
    yercekimi: 1500,
    egimOrt: 0.62,          // yamacın ortalama dikliği (dy/dx)
    egimDalgaUzun: 0.16,    // geniş iniş ve düzlükler
    egimDalgaKisa: 0.10,    // kısa tümsekler
    surtunme: 1.1,          // terminal hız = eğim ivmesi / sürtünme
    maxHiz: 700,
    enAzHiz: 60,
    zipKuvvet: 520,         // yamaca dik zıplama kuvveti
    boy: 34,
    hizPaylasim: 0.5,       // çarpışınca hızlar ne kadar ortaklaşsın
    ezilmeYavaslatma: 0.55, // üstünde biri varken saniyelik yavaşlama oranı
    slipstream: 0.75,       // geride kalan hemen toparlasın
    enFazlaGeri: 380        // kimse bundan fazla geri kalamaz
  },

  ok: {
    turSureSn: 30,
    diziUzunluk: 500,     // kimsenin bitiremeyeceği kadar uzun olmalı
    gorunenOk: 6,         // şeritte önden kaç ok görünür
    yanlisDonmaSn: 0.45,  // yanlış tuş: kısa ceza, spam engelleyecek kadar
    botTepkiMin: 0.2,
    botTepkiMax: 0.5,
    botHataOlasilik: 0.07
  },

  kuyruk: {
    turSureSn: 60,
    oyuncuYaricap: 14,
    hiz: 205,
    ivme: 1300,
    surtunme: 5,
    kuyrukYavaslatma: 13,   // her ekstra kuyruk hızını bu kadar düşürür
    enAzHiz: 130,
    segmentMesafe: 17,
    segmentYaricap: 8,
    atilmaHiz: 430,         // Boşluk ile kısa atılma
    atilmaBeklemeSn: 1.6,
    dokunulmazlikSn: 1.2,
    baslangicKuyruk: 3,     // tek kuyrukta ilk temasta eleniyordun, tur kısaydı
    botKararSn: 0.2
  },

  balon: {
    turSureSn: 60,
    yercekimi: 1600,
    hiz: 205,
    havaKontrol: 0.75,   // havadayken yatay kontrol payı
    zipHiz: 630,         // kat arası ~100 px; 570 ile zıplama sınırda kalıyordu
    // Vuruş toleransları — dar tutulunca "bastım ama patlamadı" hissi veriyor
    vurusYatay: 34,      // yatay yakalama genişliği
    vurusPayi: 12,       // balon yığınının tepesinden ne kadar yukarısı sayılır
    tepePayi: 70,        // zıplamanın tepesinde (hız ~0) da vuruş geçerli
    oyuncuYaricap: 14,
    balonYaricap: 8,
    balonSayisi: 3,
    dokunulmazlikSn: 1.3,
    sekmeHiz: 420,       // balon patlatınca patlatanın sekmesi
    platformKalinlik: 12,
    botKararSn: 0.15
  },

  kral: {
    turSureSn: 45,
    tepeYaricap: 58,     // beşi birden sığmasın: itişme bundan doğuyor
    oyuncuYaricap: 18,
    ivme: 950,
    maxHiz: 235,
    surtunme: 4.5,       // buz değil: kontrol iyi, itiş kakış net
    esneklik: 1.15,
    // Omuz: her yöne dağılan zayıf itiş yerine baktığın yöne sert bir darbe
    omuzGuc: 900,
    omuzMenzil: 82,
    omuzKoni: 0.35,      // cos eşiği — bu değerin üstü koninin içi sayılır
    omuzBeklemeSn: 1.3,
    puanHizi: 14,        // tepedeki puan akışı — kalabalıkta BÖLÜŞÜLÜR
    tepeKaymaSn: 13,     // tepe bu aralıkla yer değiştirir
    tepeKaymaSuresi: 1.6
  },

  boya: {
    turSureSn: 30,
    hucre: 20,            // boyama çözünürlüğü
    oyuncuYaricap: 13,
    hiz: 185,
    firca: 16,            // bu yarıçaptaki hücreler boyanır
    botKararSn: 0.5
  },

  zemin: {
    turSureSn: 90,
    // Karo büyük ve çatlama hızlıyken zemin 5 saniyede tükeniyordu; küçük
    // karo + uzun çatlama süresi turu 20-30 saniyeye çıkarıyor.
    yaricap: 19,          // altıgen karonun yarıçapı
    oyuncuYaricap: 11,
    hiz: 140,
    catlamaSn: 2.5,       // bastıktan sonra karo bu sürede çöker
    catlamaEnAz: 0.9,     // zorluk arttıkça buraya kadar iner
    zorlukSn: 25,         // her bu sürede çatlama süresi kısalır
    zorlukAzalma: 0.22,
    dusmeSn: 0.55,        // karo düşerken geçen süre (üstünde durulamaz)
    oyuncuDusmeSn: 0.9,
    botKararSn: 0.14
  },

  isik: {
    turSureSn: 60,
    hucre: 10,           // iz kalınlığı ve çarpışma çözünürlüğü
    hiz: 130,            // px/sn — durmak yok, sürekli ilerlersin
    hizArtisSn: 12,      // her bu sürede hız artar
    hizArtisi: 18,
    maxHiz: 260,
    kenarBosluk: 60      // doğuşların kenardan uzaklığı
  },

  bomba: {
    turSureSn: 90,
    hucre: 40,
    sutun: 19,          // tek sayı olmalı: çift indekslere sert sütun geliyor
    satir: 11,
    oyuncuYaricap: 13,
    hiz: 165,
    hizBonusu: 20,      // her hız bonusunun kattığı
    maxHiz: 255,
    fitilSn: 2.6,
    alevOmurSn: 0.5,
    baslangicBomba: 1,
    baslangicMenzil: 2,
    maxBomba: 6,
    maxMenzil: 8,
    kutuOran: 0.72,     // uygun hücrelerin bu kadarı kırılabilir kutu olur
    bonusOran: 0.32,    // kırılan kutudan bonus çıkma olasılığı
    botKararSn: 0.12
  },

  sumo: {
    turSureSn: 60,
    arenaYaricap: 230,       // 500 px yüksekliğe sığan pratik üst sınır
    oyuncuYaricap: 18,       // arenaya oranla küçüldü: manevra alanı arttı
    // Zemin buz: ivme düşük, sürtünme düşük. Terminal hız ivme/sürtünme.
    ivme: 340,
    surtunme: 1.15,
    sarjHizi: 0.85,          // saniyede biriken güç (0..1)
    sarjFren: 5,             // tam şarjdaki fren gücü; şarjla orantılı artar
    sarjEnAz: 0.12,          // bunun altında bırakırsan atılma olmaz
    atilmaEnAz: 230,         // en küçük şarjla atılma hızı
    atilmaEnCok: 700,        // tam şarjla
    esneklik: 1.15,          // çarpışmada geri tepme
    dusmeSn: 0.9,
    kucultmeSn: 20,          // son bu sürede arena daralır, tur kilitlenmesin
    kucultmeOran: 0.55       // arena bu orana kadar küçülür
  },

  orumcek: {
    turSureSn: 150,         // güvenlik ağı
    insanHiz: 168,
    insanYaricap: 13,
    yapisikYavaslatma: 0.72, // sırtında örümcek varken yavaşlarsın
    orumcekHiz: 250,         // insandan belirgin hızlı — kaçmak yetmez
    orumcekYaricap: 13,
    fitilSn: 8,              // patlamaya kalan süre
    fitilAzalma: 0.78,       // her ölümden sonra fitil kısalır
    fitilEnAz: 4,
    firlatmaHiz: 640,
    firlatmaSurtunme: 2.3,
    firlatmaSekme: 3,
    dokunulmazlikSn: 1.1,    // fırlatan bu süre boyunca yeniden yapıştırılamaz
    yurumeDurmaHiz: 90,      // fırlatılan örümcek bu hızın altında yürümeye döner
    yolTazeleSn: 0.16,       // hedef hareket ettikçe yol haritası yenilenir
    // Fitilin son diliminde örümcek hızlanır. Yapışamadan fitil biterse
    // kimse ölmediği için, tur ilerlesin diye yakalama şansı artırılıyor.
    panikEsigi: 0.32,
    panikHizCarpani: 1.4
  },

  cember: {
    turSureSn: 90,          // güvenlik ağı; normalde zorluk artışı bitirir
    yaricap: 185,
    oyuncuHiz: 2.3,         // radyan/sn, çember üzerinde
    oyuncuYaricap: 15,
    ilkBekleme: 1.6,
    baslangicZorluk: 5,     // oyun bu kademeden başlar; altı fazla kolaydı
    zorlukBasamakSn: 10,    // her bu sürede zorluk bir kademe artar
    botTepkiMin: 0.14,      // bot kusursuz olmasın, gecikmeyle karar versin
    botTepkiMax: 0.36,
    araBaslangic: 1.7,      // saldırılar arası süre (zorlukla kısalır)
    araEnAz: 0.45,
    uyariBaslangic: 1.0,    // uyarı süresi (zorlukla kısalır)
    uyariEnAz: 0.42,
    isinSuresi: 0.35,
    isinGenislik: 0.34,     // radyan
    mermiHiz: 210,
    mermiVurmaAci: 0.16,
    boslukGenislik: 0.55,
    boslukSuresi: 1.6
  },

  refleks: {
    turSureSn: 30,
    gorunmeSn: 1.0,      // nesne kapılmazsa bu kadar sonra kaybolur
    kapmaGosterimSn: 0.4,
    beklemeMin: 0.45,    // iki nesne arası boşluk
    beklemeMax: 1.3,
    spamDonmaSn: 1.2,    // ortada bir şey yokken basarsan elin donar
    bombaDonmaSn: 3,
    buzDonmaSn: 1.5,     // buzu kapan hariç herkes donar
    botTepkiMin: 0.3,    // botun refleksi — insan ~0.25 sn
    botTepkiMax: 0.7,
    botYanilma: 0.18     // botun kötü nesneye basma olasılığı
  },

  bot: {
    kararSn: 0.4,       // hedef/yön güncelleme sıklığı
    atisAciEsigi: 0.15, // hedefe bu kadar dönükken ateş eder (radyan)
    gorusAdim: 12,      // görüş hattı örnekleme adımı (px)
    takilmaPx: 16,      // bir karar aralığında bundan az ilerlediyse takıldı say
    kurtulmaSn: 0.9     // takılınca bu süre boyunca duvardan kaçınmaya çalışır
  },

  tur: {
    geriSayimSn: 3,
    sonPerdeSn: 3.5,    // "X kazandı" perdesinin süresi, sonra yeni tur
    finalPerdeSn: 9,    // seri sonu şampiyon ekranı
    turSecenekleri: [3, 5, 8],
    varsayilanTur: 5,
    // Her tur sıralamaya göre puan dağıtılır. Yalnızca kazanana puan
    // vermek, berabere biten turları tamamen boşa çıkarıyordu.
    siraPuanlari: [3, 2, 1]
  },

  yayin: {
    durumMs: 33,        // host durum yayını (~30 Hz)
    yumusatmaHizi: 22,  // misafirde gelen konuma yaklaşma hızı
    benYumusatma: 30,   // kendi karakterin daha çabuk toparlansın
    // Nabız sık, kopma eşiği geniş: tarayıcı arka plan sekmesinde
    // zamanlayıcıları kısınca 4 saniyelik eşik yanlışlıkla "koptu" diyor ve
    // masumca oyundan atıyordu.
    nabizMs: 800,
    kopmaMs: 9000       // bu kadar sessizlik = koptu
  },

  agZamanAsimiMs: 15000,

  renkler: ['#2ecc40', '#e63946', '#2f6df6', '#ff9f1c', '#9b5de5'],

  net: {
    // Otorite sunucuda. Boş bırakılırsa aynı makinedeki sunucuya bağlanır
    // (geliştirme); yayında buraya Render adresi yazılır.
    // Render'daki servisin adresi. Servis adını değiştirirsen burayı da
    // güncelle, yoksa yayındaki oyun sunucuyu bulamaz.
    sunucu: 'wss://puzzle-game.onrender.com',
    // Ücretsiz barındırmada sunucu uykuya dalabiliyor, uyanması ~1 dakika
    baglantiZamanAsimiMs: 75000,
    // Metered deneme hesabı (README'deki çalışan yapılandırma).
    // DİKKAT: TURN alan adı panel alan adıyla AYNI DEĞİL.
    turn: {
      host: 'global.relay.metered.ca',
      username: '7ea849840c346367c20aa635',
      credential: 'zioLuy8n7tYIpf94'
    },
    stun: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302'
    ]
  }
};
