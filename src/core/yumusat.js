// Misafir tarafı yumuşatma.
//
// Oda sahibi durumu saniyede ~30 kez yayınlıyor, ekran ise 60 kez çiziliyor.
// Gelen konumu doğrudan yazarsan nesne iki kare kıpırdamayıp üçüncüde
// sıçrıyor — "donarak ilerleme" bundan geliyor ve sıçrama nesne ne kadar
// hızlıysa o kadar büyük oluyor (yarışta 700 px/sn = her pakette 23 px).
//
// Çözüm: gelen değer hedef olarak saklanır, her çizim karesinde ona doğru
// kayılır. Ağ trafiği hiç artmaz.
MG.yumusat = (function () {
  // Kare hızından bağımsız üstel yaklaşma: dt ne olursa olsun aynı his.
  function katsayi(dt, hiz) {
    return 1 - Math.exp(-(hiz || 20) * dt);
  }

  function deger(simdi, hedef, dt, hiz) {
    return simdi + (hedef - simdi) * katsayi(dt, hiz);
  }

  function aci(simdi, hedef, dt, hiz) {
    var fark = MG.geo.aciNormalle(hedef - simdi);
    return MG.geo.aciNormalle(simdi + fark * katsayi(dt, hiz));
  }

  // nesne.hx/hy hedef konumdur. Hedef çok uzaksa (yeni tur, doğuş,
  // ışınlanma) yumuşatma yapılmaz — yoksa nesne ekranda süzülerek gider.
  function nokta(nesne, dt, hiz, sicrama) {
    if (nesne.hx == null) return;
    var dx = nesne.hx - nesne.x, dy = nesne.hy - nesne.y;
    var esik = sicrama || 140;
    if (dx * dx + dy * dy > esik * esik) {
      nesne.x = nesne.hx; nesne.y = nesne.hy;
      return;
    }
    var k = katsayi(dt, hiz);
    nesne.x += dx * k;
    nesne.y += dy * k;
  }

  // Tek eksenli hâli (yokuşta yol boyu mesafe gibi)
  function eksen(nesne, alan, hedefAlan, dt, hiz, sicrama) {
    if (nesne[hedefAlan] == null) return;
    var fark = nesne[hedefAlan] - nesne[alan];
    if (Math.abs(fark) > (sicrama || 140)) { nesne[alan] = nesne[hedefAlan]; return; }
    nesne[alan] += fark * katsayi(dt, hiz);
  }

  return { katsayi: katsayi, deger: deger, aci: aci, nokta: nokta, eksen: eksen };
})();
