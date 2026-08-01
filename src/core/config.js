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
  net: { snapshotMs: 180, timeoutMs: 4000 },

  fx: {
    maxShake: 16,
    shakeDecay: 0.9,
    flashDecay: 0.88,
    maxParticles: 260,
    windParticles: 46,
    announceMs: 2000
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

  sim: { stepMs: 1000 / 60 }
};
