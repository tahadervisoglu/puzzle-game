window.PP = window.PP || {};

// Tüm denge sayıları burada. Kod bilmeden ayar yapmak için bu dosyayı düzenle
// ve sayfayı yenile. Çalışırken denemek için ayarlar panelini kullan (T tuşu).
PP.config = {
  seed: 20260801,

  puzzle: {
    cols: 5,
    rows: 3,
    // Kaynak resimdeki parça kenarı (px). Ekrandaki boyuttan bağımsız,
    // yüksek tutmak parçaların yakınlaştırıldığında net kalmasını sağlar.
    sourcePieceSize: 220
  },

  table: {
    pieceSize: 128,        // ekranda bir parçanın kenarı (px)
    padding: 20,           // masanın dış kenar boşluğu
    boardMargin: 0.35,     // ızgara çevresinde parça saçılmayan tampon (parça kenarı oranı)
    scatterGap: 1.08,      // saçılma slotları arası boşluk çarpanı
    bandSlack: 0.3         // kenar bandına bırakılan fazladan pay (parça kenarı oranı)
  },

  feel: {
    liftScale: 0.06,       // tutunca parçanın büyüme oranı
    liftSpeed: 0.28,       // tutma/bırakma animasyon hızı (0-1)
    shadowBlur: 22
  },

  snap: { toleranceRatio: 0.55 },   // ızgara hücresine yapışma toleransı

  // Izgara dışında parçaların birbirine yapışması. Tolerans ızgaradan dar:
  // yan yana park edilen parçalar kazara birleşmesin, isteyerek hizalansın.
  join: { toleranceRatio: 0.3, maxCascade: 4 },

  // 'klasik' = herkese kendi parçaları düşer · 'havuz' = ortak havuzdan kapılır
  mode: 'klasik',

  // Klasik mod: parçalar doğrudan oyuncunun masasına düşer
  drip: {
    intervalMs: 3000,
    initial: 3
  },

  // Havuz modu: parçalar kimseye ait değil, ortaya düşer ve herkes kapar.
  pool: {
    intervalMs: 1100,    // havuza kaç ms'de bir yeni parça düşer
    initial: 6,          // oyun başında havuzda hazır duran parça
    capacity: 14,        // havuzda aynı anda durabilecek parça
    trayLimit: 6,        // bir oyuncunun masasında bekleyebilecek boş parça
    claimCooldownMs: 220 // arka arkaya kapma freni
  },

  // Rakip panelleri her karede çizmeye gerek yok
  render: { spectatorEveryN: 3 },

  // Sekme aniden kapanınca WebRTC kopmayı bildirmiyor; sürekli akan tahta
  // özetlerini nabız sayıp bu süre kadar sessizlik olursa kopmuş sayıyoruz.
  net: {
    snapshotMs: 180,
    heartbeatMs: 1200,   // tahta değişmese de bu aralıkta bir nabız gönderilir
    timeoutMs: 4000,
    connectTimeoutMs: 15000,   // bu sürede bağlanamazsa anlamlı hata ver

    // Ev bağlantılarının çoğu (CGNAT) doğrudan bağlantıya izin vermiyor.
    // STUN sadece "dış IP'm ne" sorusunu cevaplar; bağlantı yine kurulamazsa
    // trafiği TURN aktarıcısı üzerinden taşımak gerekir.
    //
    // TURN kimlik bilgileri sağlayıcıdan çalışma anında çekiliyor (kısa ömürlü
    // bilgiler geliyor). Anahtar bu depoda açıkta duruyor; depo public olduğu
    // için başkası da kotayı kullanabilir. Kotayı korumak gerekirse anahtarı
    // sağlayıcı panelinden yenile.
    // Üç yol da desteklenir, bu sırayla denenir:
    //   1) servers  → sağlayıcı panelinden kopyalanan diziyi olduğu gibi yapıştır
    //   2) username+credential → adresler host'tan üretilir
    //   3) apiKey   → kimlik bilgileri çalışma anında çekilir
    //
    // DİKKAT: TURN sunucusunun alan adı, panelin alan adıyla AYNI DEĞİLDİR.
    // Panel "puzzlegameaa.metered.live" olsa bile TURN adresleri
    // "...relay.metered.ca" üzerindedir. En garantisi panelde kimlik bilgisinin
    // yanındaki "Show ICE Servers Array" çıktısını buraya yapıştırmaktır.
    turn: {
      host: 'global.relay.metered.ca',
      apiHost: 'puzzlegameaa.metered.live',
      apiKey: '',
      username: '7ea849840c346367c20aa635',
      credential: 'zioLuy8n7tYIpf94',
      servers: []    // panelden kopyalanan dizi buraya; doluysa üstteki alanlar kullanılmaz
    },

    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  },

  fx: {
    maxShake: 16,
    shakeDecay: 0.9,
    flashDecay: 0.88,
    maxParticles: 300,
    windParticles: 46,
    announceMs: 2000,
    flyDecay: 0.82,      // savrulan parçanın yerine oturma hızı
    popDecay: 0.86,      // yerleşme sıçramasının sönümü
    popScale: 0.13,      // yerleşince parçanın ne kadar şişeceği
    ghostAlpha: 0.6,     // Poster büyüsünde tam resmin saydamlığı
    ghostFadeSec: 1.4    // son saniyelerde sönerek kaybolur
  },

  audio: {
    enabled: true,
    volume: 0.32
  },

  // Düşünme süresi parça gelme aralığının biraz üstünde tutuluyor: aksi halde
  // bot parçayı gelir gelmez yerleştirir ve insanın yetişmesi imkânsız olur.
  bots: [
    { name: 'Bot 1', thinkMs: 1700, jitterMs: 900, errorRate: 0.12, dragMs: 380, claimMs: 900 },
    { name: 'Bot 2', thinkMs: 2300, jitterMs: 1300, errorRate: 0.2, dragMs: 460, claimMs: 1400 },
    { name: 'Bot 3', thinkMs: 3100, jitterMs: 1700, errorRate: 0.28, dragMs: 540, claimMs: 2000 }
  ],

  skills: {
    thresholdStart: 0.1,        // her %10 doğru parçada bir kart
    thresholdMin: 0.06,
    shrinkEverySec: 25,         // süre uzadıkça eşik küçülür (%10 → %9 → %8)
    shrinkStep: 0.01,
    lastPlaceBonus: 0.75,       // son sıradakinin sayacı daha hızlı dolar
    pocketSize: 2,
    warningSec: 1,              // saldırı hedefin ekranında önce uyarı verir
    spamWindowSec: 20,          // aynı hedefe aynı büyü tekrarlanırsa
    spamScale: 0.5,             // etkisi yarıya iner
    botPickDelay: [0.4, 1.4],
    botUseDelay: [0.8, 3]
  },

  // Kumar destesi: beceriye değil zamana bağlı, kör gelir, elde biriktirilir.
  gamble: {
    drawMs: 10000,      // kaç ms'de bir el'e kart gelir
    handSize: 5,        // elde en fazla kaç kart durur
    duelSec: 10,        // Düello kartının süresi
    botPlayDelay: [1.5, 5]
  },

  sim: { stepMs: 1000 / 60 }
};
