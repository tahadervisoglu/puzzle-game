// Kabuğun paylaştığı durum. Modüller kendi kopyasını tutmaz, buradan okur.
MG.oturum = {
  benKoltuk: 0,
  koltuklar: [],        // dizin = koltuk; null | { ad, bot }
  skorlar: {},          // koltuk -> kazanılan tur
  evre: 'giris',        // giris | lobi | sayim | oyun | son | final
  oyunDurum: null,
  oyun: null,           // aktif minigame nesnesi
  turSayisi: MG.ayar.tur.varsayilanTur, // seride kaç tur oynanacak
  turNo: 0,             // kaçıncı tur (1'den başlar)
  oyunHavuzu: [],       // karıştırılmış oyun sırası — tekrar etmesin diye
  sonOyun: null,
  secilenOyun: null,    // null = karışık; doluysa her tur o oyun oynanır

  oturanSayisi: function () {
    var n = 0;
    for (var i = 0; i < MG.ayar.oyuncuMax; i++) {
      if (this.koltuklar[i]) n++;
    }
    return n;
  },

  // Ağda taşınan sade koltuk listesi
  koltukOzet: function () {
    var s = [];
    for (var i = 0; i < MG.ayar.oyuncuMax; i++) {
      s[i] = this.koltuklar[i]
        ? { ad: this.koltuklar[i].ad, bot: !!this.koltuklar[i].bot }
        : null;
    }
    return s;
  },

  sifirla: function () {
    this.benKoltuk = 0;
    this.koltuklar = [];
    this.skorlar = {};
    this.evre = 'giris';
    this.oyunDurum = null;
    this.oyun = null;
    this.turNo = 0;
    this.oyunHavuzu = [];
    this.sonOyun = null;
    this.secilenOyun = null;
  }
};
