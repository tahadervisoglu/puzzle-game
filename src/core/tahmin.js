// Gecikme gizleme (client-side prediction) için ortak yardımcılar.
//
// Otorite sunucuda olduğu için tuşa bastığında hareketi görmen bir gidiş-dönüş
// kadar (ölçtüğümüz kadarıyla ~82 ms) sürüyordu. Çözüm: kendi oyuncunu
// istemcide de ilerlet, sunucudan gelen doğruyu düzeltme olarak kullan.
//
// İşin püf noktası burada: sunucudan gelen konum ŞU ANKİ konumla
// karşılaştırılmaz. Sunucunun gönderdiği durum, bir gidiş-dönüşün yarısı
// kadar geçmişe aittir; şu anki tahminimiz doğal olarak ondan ileridedir.
// Doğru karşılaştırma, o durumun ait olduğu ANDAKİ tahminimizledir — bu
// yüzden tahmin edilen konumların kısa bir geçmişi tutulur. Aksi halde
// oyuncu her pakette geriye çekilir ve tahminin bütün faydası kaybolur.

// Tek sayaç: duvar saatinden bağımsız, geriye gitmeyen zaman. Date.now()
// saat ayarlanınca sıçrayabiliyor ve sapma hesabı buna dayandığı için
// oyuncu ışınlanmış gibi görünür.
//
// Sunucu oyun dosyalarını `vm` kum havuzunda çalıştırıyor ve orada
// `performance` tanımlı değil; bu yüzden varlığı sınanıyor.
MG.simdi = (typeof performance !== 'undefined' && performance.now)
  ? function () { return performance.now(); }
  : function () { return Date.now(); };

MG.tahmin = (function () {
  var A = MG.ayar;

  function ayar() { return A.tahmin; }

  // Her tahmin adımında çağrılır: o anki konumu zaman damgasıyla saklar.
  function pozKaydet(t, z) {
    if (!t.poz) t.poz = [];
    t.poz.push({ z: z, x: t.x, y: t.y, aci: t.aci || 0 });
    var sinir = z - ayar().gecmisMs;
    while (t.poz.length > 1 && t.poz[0].z < sinir) t.poz.shift();
  }

  // z anına en yakın (ondan eski) tahmin kaydı.
  function pozBul(t, z) {
    if (!t.poz || !t.poz.length) return null;
    var en = t.poz[0];
    for (var i = 0; i < t.poz.length; i++) {
      if (t.poz[i].z > z) break;
      en = t.poz[i];
    }
    return en;
  }

  // Sunucudan gelen doğru konumu işler. Sapma birikimli bir düzeltme olarak
  // saklanır, erit() onu zamana yayarak konuma yedirir.
  function duzelt(t, sx, sy, saci, gecikmeMs) {
    var eski = pozBul(t, MG.simdi() - gecikmeMs / 2);
    if (!eski) {   // geçmiş yok (tur yeni başladı): doğrudan otur
      t.x = sx; t.y = sy;
      if (saci != null) t.aci = saci;
      return;
    }
    var hx = sx - eski.x, hy = sy - eski.y;
    var sic = ayar().sicramaPx;
    if (hx * hx + hy * hy > sic * sic) {
      // Bu kadar sapma yumuşatılamaz: duvarın içine girmiş ya da sunucu bizi
      // ışınlamış olabilir. Yumuşatmaya çalışmak lastik gibi çekiştirir.
      t.x = sx; t.y = sy;
      if (saci != null) t.aci = saci;
      t.dx = t.dy = 0;
      t.poz = null;
      return;
    }
    t.dx = (t.dx || 0) + hx;
    t.dy = (t.dy || 0) + hy;
    if (saci != null) t.aci = saci;   // açıda tahmin sapması birikmez
  }

  // Biriken sapmayı ani sıçrama olmadan konuma yedirir.
  function erit(t, dt) {
    if (!t.dx && !t.dy) return;
    var k = MG.yumusat.katsayi(dt, ayar().duzeltmeHizi);
    var ax = t.dx * k, ay = t.dy * k;
    t.x += ax; t.y += ay;
    t.dx -= ax; t.dy -= ay;
    if (Math.abs(t.dx) < 0.01) t.dx = 0;
    if (Math.abs(t.dy) < 0.01) t.dy = 0;
  }

  function sifirla(t) { t.poz = null; t.dx = t.dy = 0; }

  return {
    pozKaydet: pozKaydet,
    pozBul: pozBul,
    duzelt: duzelt,
    erit: erit,
    sifirla: sifirla
  };
})();
