// Oyun kodunu Node tarafında yükler.
//
// Oyun dosyaları tarayıcı için yazıldı ama baştan beri "games/ katmanı ağı ve
// DOM'u tanımaz" kuralına uyuyorlar; bu yüzden aynı dosyalar sunucuda da
// çalışıyor. Tek istisna config.js'in `window.MG` yazması ve ses.js'in
// AudioContext araması — ikisi de sahte bir `window` ile karşılanıyor,
// AudioContext bulunmayınca ses kendiliğinden sessize düşüyor.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Sıra önemli: bazı oyunlar yüklenirken bağımlılığını okuyor
// (ör. bomba.js modül seviyesinde MG.bombaIzgara'yı alıyor).
const DOSYALAR = [
  'config.js',
  'src/core/rng.js',
  'src/core/ses.js',
  'src/core/geo.js',
  'src/core/yumusat.js',
  'src/core/tahmin.js',
  'src/games/tank.js',
  'src/games/forklift.js',
  'src/games/forklift.bot.js',
  'src/games/refleks.js',
  'src/games/yaris.pist.js',
  'src/games/yaris.js',
  'src/games/yaris.bot.js',
  'src/games/cember.js',
  'src/games/cember.bot.js',
  'src/games/yokus.yamac.js',
  'src/games/yokus.js',
  'src/games/yokus.bot.js',
  'src/games/orumcek.harita.js',
  'src/games/orumcek.yol.js',
  'src/games/orumcek.js',
  'src/games/orumcek.bot.js',
  'src/games/sumo.js',
  'src/games/sumo.bot.js',
  'src/games/bomba.izgara.js',
  'src/games/bomba.js',
  'src/games/bomba.bot.js',
  'src/games/isik.js',
  'src/games/isik.bot.js',
  'src/games/zemin.js',
  'src/games/zemin.bot.js',
  'src/games/boya.js',
  'src/games/boya.bot.js',
  'src/games/kral.js',
  'src/games/kral.bot.js',
  'src/games/balon.js',
  'src/games/balon.bot.js',
  'src/games/kuyruk.js',
  'src/games/kuyruk.bot.js',
  'src/games/ok.js'
];

function yukle() {
  const kok = path.join(__dirname, '..');
  const kapsam = {
    Math: Math, Date: Date, JSON: JSON, console: console,
    Uint8Array: Uint8Array, Int16Array: Int16Array, Int32Array: Int32Array,
    Float32Array: Float32Array, Float64Array: Float64Array,
    Object: Object, Array: Array, String: String, Number: Number,
    isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: setInterval, clearInterval: clearInterval
  };
  // Dosyalar `window.MG` bekliyor; kapsamın kendisini window sayıyoruz
  kapsam.window = kapsam;
  kapsam.globalThis = kapsam;

  const ctx = vm.createContext(kapsam);
  for (const dosya of DOSYALAR) {
    const tamYol = path.join(kok, dosya);
    const kod = fs.readFileSync(tamYol, 'utf8');
    try {
      vm.runInContext(kod, ctx, { filename: dosya });
    } catch (e) {
      throw new Error('Oyun dosyası yüklenemedi: ' + dosya + ' — ' + e.message);
    }
  }

  const MG = kapsam.MG;
  if (!MG || !MG.oyunlar) throw new Error('MG.oyunlar oluşmadı');

  // Ses sunucuda anlamsız; çağrılar boşa gitsin diye sustur.
  if (MG.ses && MG.ses.sustur) MG.ses.sustur(true);

  return MG;
}

module.exports = { yukle, DOSYALAR };
