// Bir oyun odası: lobi, tur serisi ve otoriter simülasyon.
//
// Tarayıcıdaki tur.js'in "oda sahibi" dalının sunucudaki karşılığı. Fark şu:
// artık kimse ayrıcalıklı değil, dünyayı sunucu işletiyor. Oda sahibi
// yalnızca lobi kararlarını veriyor (kaç tur, hangi oyun, başlat, bot).
const MG = require('./oyunYukle').yukle();
const A = MG.ayar;

var sonrakiOdaNo = 1;

function Oda() {
  this.no = sonrakiOdaNo++;
  this.koltuklar = [];        // dizin = koltuk; null | {ad, bot, baglanti}
  this.evre = 'lobi';         // lobi | sayim | oyun | son | final
  this.turSayisi = A.tur.varsayilanTur;
  this.secilenOyun = null;    // null = karışık
  this.turNo = 0;
  this.skorlar = {};
  this.oyun = null;
  this.oyunDurum = null;
  this.oyunHavuzu = [];
  this.sonOyun = null;
  this.sayimKalan = 0;
  this.yayinBirikim = 0;
  this.zamanlayici = null;
  this.sonEtkinlik = Date.now();
}

// --- koltuk yönetimi -------------------------------------------------------

Oda.prototype.bosKoltuk = function () {
  for (var i = 0; i < A.oyuncuMax; i++) {
    if (!this.koltuklar[i]) return i;
  }
  return -1;
};

Oda.prototype.oturanSayisi = function () {
  var n = 0;
  for (var i = 0; i < A.oyuncuMax; i++) {
    if (this.koltuklar[i]) n++;
  }
  return n;
};

Oda.prototype.insanSayisi = function () {
  var n = 0;
  for (var i = 0; i < A.oyuncuMax; i++) {
    if (this.koltuklar[i] && !this.koltuklar[i].bot) n++;
  }
  return n;
};

// Oda sahibi: en küçük numaralı insan koltuğu. Ayrılırsa sıradakine geçer,
// yoksa lobi kilitlenir ve kimse başlatamaz.
Oda.prototype.sahipKoltuk = function () {
  for (var i = 0; i < A.oyuncuMax; i++) {
    if (this.koltuklar[i] && !this.koltuklar[i].bot) return i;
  }
  return -1;
};

Oda.prototype.koltukOzet = function () {
  var s = [];
  for (var i = 0; i < A.oyuncuMax; i++) {
    s[i] = this.koltuklar[i]
      ? { ad: this.koltuklar[i].ad, bot: !!this.koltuklar[i].bot }
      : null;
  }
  return s;
};

// --- mesajlaşma ------------------------------------------------------------

Oda.prototype.yolla = function (koltuk, mesaj) {
  var k = this.koltuklar[koltuk];
  if (!k || !k.baglanti) return;
  try {
    if (k.baglanti.readyState === 1) k.baglanti.send(JSON.stringify(mesaj));
  } catch (e) { /* kopan bağlantı bir sonraki turda temizlenir */ }
};

Oda.prototype.yayinla = function (mesaj) {
  var metin = JSON.stringify(mesaj);
  for (var i = 0; i < A.oyuncuMax; i++) {
    var k = this.koltuklar[i];
    if (!k || !k.baglanti) continue;
    try {
      if (k.baglanti.readyState === 1) k.baglanti.send(metin);
    } catch (e) { /* yoksay */ }
  }
};

Oda.prototype.lobiDurumYayinla = function () {
  this.yayinla({
    t: 'lobiDurum',
    koltuklar: this.koltukOzet(),
    turSayisi: this.turSayisi,
    secilenOyun: this.secilenOyun,
    sahip: this.sahipKoltuk()
  });
};

// --- katılım ---------------------------------------------------------------

Oda.prototype.katil = function (baglanti, ad) {
  if (this.evre !== 'lobi') return { hata: 'Oyun sürüyor — birazdan tekrar dene.' };
  var koltuk = this.bosKoltuk();
  if (koltuk < 0) return { hata: 'Oda dolu.' };

  this.koltuklar[koltuk] = { ad: ad, bot: false, baglanti: baglanti };
  this.sonEtkinlik = Date.now();

  this.yolla(koltuk, {
    t: 'hosgeldin',
    koltuk: koltuk,
    koltuklar: this.koltukOzet(),
    turSayisi: this.turSayisi,
    secilenOyun: this.secilenOyun,
    skorlar: this.skorlar,
    sahip: this.sahipKoltuk()
  });
  this.lobiDurumYayinla();
  return { koltuk: koltuk };
};

Oda.prototype.ayril = function (koltuk) {
  if (!this.koltuklar[koltuk]) return;
  this.koltuklar[koltuk] = null;
  delete this.skorlar[koltuk];
  if (this.oyun && this.oyun.oyuncuDustu && this.oyunDurum) {
    this.oyun.oyuncuDustu(this.oyunDurum, koltuk);
  }
  this.sonEtkinlik = Date.now();

  // Kimse kalmadıysa oda kapanır (index.js temizler)
  if (this.insanSayisi() === 0) return;

  if (this.evre === 'lobi') this.lobiDurumYayinla();
  else if (this.oturanSayisi() < 2) this.lobiyeDon();
  else this.lobiDurumYayinla();
};

// --- lobi kararları (yalnızca oda sahibi) ----------------------------------

Oda.prototype.ayarla = function (koltuk, turSayisi, secilenOyun) {
  if (koltuk !== this.sahipKoltuk() || this.evre !== 'lobi') return;
  if (A.tur.turSecenekleri.indexOf(turSayisi) >= 0) this.turSayisi = turSayisi;
  if (secilenOyun === null || MG.oyunlar[secilenOyun]) this.secilenOyun = secilenOyun;
  this.lobiDurumYayinla();
};

Oda.prototype.botEkle = function (koltuk) {
  if (koltuk !== this.sahipKoltuk() || this.evre !== 'lobi') return;
  var bos = this.bosKoltuk();
  if (bos < 0) return;
  this.koltuklar[bos] = { ad: 'Bot ' + 'ABCDE'[bos], bot: true, baglanti: null };
  this.lobiDurumYayinla();
};

Oda.prototype.botSil = function (koltuk, hedef) {
  if (koltuk !== this.sahipKoltuk() || this.evre !== 'lobi') return;
  if (this.koltuklar[hedef] && this.koltuklar[hedef].bot) {
    this.koltuklar[hedef] = null;
    this.lobiDurumYayinla();
  }
};

Oda.prototype.baslat = function (koltuk) {
  if (koltuk !== this.sahipKoltuk() || this.evre !== 'lobi') return;
  if (this.oturanSayisi() < 2) return;
  this.seriBaslat();
};

// --- tur serisi ------------------------------------------------------------

Oda.prototype.seriBaslat = function () {
  this.turNo = 0;
  this.skorlar = {};
  this.oyunHavuzu = this.karistir(Object.keys(MG.oyunlar));
  this.sonOyun = null;
  this.sonrakiTur();
};

Oda.prototype.karistir = function (dizi) {
  var a = dizi.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};

Oda.prototype.sonrakiOyunId = function () {
  if (this.secilenOyun && MG.oyunlar[this.secilenOyun]) {
    this.sonOyun = this.secilenOyun;
    return this.sonOyun;
  }
  if (!this.oyunHavuzu.length) {
    this.oyunHavuzu = this.karistir(Object.keys(MG.oyunlar));
    if (this.oyunHavuzu.length > 1 && this.oyunHavuzu[0] === this.sonOyun) {
      var t = this.oyunHavuzu[0];
      this.oyunHavuzu[0] = this.oyunHavuzu[1];
      this.oyunHavuzu[1] = t;
    }
  }
  this.sonOyun = this.oyunHavuzu.shift();
  return this.sonOyun;
};

Oda.prototype.sonrakiTur = function () {
  this.turNo++;
  var oyunId = this.sonrakiOyunId();
  var tohum = (Math.random() * 0xFFFFFFFF) >>> 0;

  this.oyun = MG.oyunlar[oyunId];
  this.oyunDurum = this.oyun.kur(tohum, this.koltukOzet());
  this.evre = 'sayim';
  this.sayimKalan = A.tur.geriSayimSn;
  this.yayinBirikim = 0;

  this.yayinla({
    t: 'basla', tohum: tohum, oyun: oyunId,
    turNo: this.turNo, turSayisi: this.turSayisi,
    koltuklar: this.koltukOzet(), skorlar: this.skorlar
  });
};

Oda.prototype.puanDagit = function (son) {
  var sira = this.oyun.siralama
    ? this.oyun.siralama(this.oyunDurum)
    : (son.kazanan != null ? [son.kazanan] : []);
  var tablo = A.tur.siraPuanlari;
  for (var i = 0; i < sira.length; i++) {
    var puan = tablo[i] || 0;
    if (puan) this.skorlar[sira[i]] = (this.skorlar[sira[i]] || 0) + puan;
  }
};

Oda.prototype.turBitir = function (son) {
  this.puanDagit(son);
  var ozet = this.oyun.ozet ? this.oyun.ozet(this.oyunDurum) : null;
  var sonTur = this.turNo >= this.turSayisi;
  this.evre = 'son';
  this.yayinla({
    t: 'son', kazanan: son.kazanan, skorlar: this.skorlar,
    ozet: ozet, sonTur: sonTur
  });

  var oda = this;
  this.zamanlayiciKur(function () {
    if (oda.evre !== 'son') return;
    if (oda.oturanSayisi() < 2) return oda.lobiyeDon();
    if (sonTur) return oda.finalBitir();
    oda.sonrakiTur();
  }, A.tur.sonPerdeSn * 1000);
};

Oda.prototype.finalBitir = function () {
  this.evre = 'final';
  this.yayinla({ t: 'final', skorlar: this.skorlar });
  var oda = this;
  this.zamanlayiciKur(function () {
    if (oda.evre === 'final') oda.lobiyeDon();
  }, A.tur.finalPerdeSn * 1000);
};

Oda.prototype.lobiyeDon = function () {
  this.zamanlayiciTemizle();
  this.evre = 'lobi';
  this.turNo = 0;
  this.oyun = null;
  this.oyunDurum = null;
  // Botlar lobide kalsın ama oyun bittiğinde tek başına kalmasın
  if (this.insanSayisi() === 0) return;
  this.yayinla({
    t: 'lobiyeDon',
    koltuklar: this.koltukOzet(),
    turSayisi: this.turSayisi,
    secilenOyun: this.secilenOyun,
    sahip: this.sahipKoltuk()
  });
};

Oda.prototype.zamanlayiciKur = function (fn, ms) {
  this.zamanlayiciTemizle();
  this.zamanlayici = setTimeout(fn, ms);
};

Oda.prototype.zamanlayiciTemizle = function () {
  if (this.zamanlayici) { clearTimeout(this.zamanlayici); this.zamanlayici = null; }
};

// --- girdi ve simülasyon ---------------------------------------------------

Oda.prototype.girdi = function (koltuk, tus, basili) {
  if (!this.oyunDurum || !this.oyun) return;
  if (this.evre !== 'oyun' && this.evre !== 'sayim') return;
  this.oyun.girdi(this.oyunDurum, koltuk, tus, basili);
  this.sonEtkinlik = Date.now();
};

// Ana döngüden çağrılır. Tarayıcıdaki simAdim'in sunucu karşılığı.
Oda.prototype.adim = function (dt) {
  if (!this.oyunDurum) return;

  if (this.evre === 'sayim') {
    this.sayimKalan -= dt;
    if (this.sayimKalan <= 0) this.evre = 'oyun';
  }

  if (this.evre === 'oyun') {
    this.oyun.guncelle(this.oyunDurum, dt);
    this.yayinBirikim += dt * 1000;
    if (this.yayinBirikim >= A.yayin.durumMs) {
      this.yayinBirikim = 0;
      this.yayinla({ t: 'durum', s: this.oyun.anlik(this.oyunDurum) });
    }
    var son = this.oyun.bitti(this.oyunDurum);
    if (son) this.turBitir(son);
  }
};

module.exports = { Oda: Oda, MG: MG };
