// Kabuğun paylaştığı durum. Modüller kendi kopyasını tutmaz, buradan okur.
MG.oturum = {
  benKoltuk: 0,
  koltuklar: [],        // dizin = koltuk; null | { ad, bot }
  skorlar: {},          // koltuk -> kazanılan tur
  evre: 'giris',        // giris | lobi | sayim | oyun | son
  oyunDurum: null,
  oyun: null,           // aktif minigame nesnesi
  secilenOyun: 'tank',  // lobide oda sahibinin seçtiği

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
  }
};
