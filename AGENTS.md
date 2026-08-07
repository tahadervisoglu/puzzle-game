# Bu depoda çalışma kuralları

## Kod düzeni

**Bir dosya 600 satırı geçmez.** Geçiyorsa sorumluluk fazladır; böl. Bölerken
dosya adı sorumluluğu anlatmalı (`lobi.js`, `tur.js`), `yardimci.js` /
`utils.js` gibi çöp kutusu dosyalar açılmaz.

**Her dosyanın tek bir sorumluluğu olur.** Bir dosyayı bir cümleyle
anlatamıyorsan yanlış bölünmüştür.

**Katmanlar arası yön tek taraflıdır:**

```
core/   ← kimseyi tanımaz (rng, ses, geometri)
net/    ← core'u tanır, oyunu tanımaz
games/  ← core'u tanır; net'i ve DOM'u TANIMAZ
shell/  ← hepsini tanır, hepsini birbirine bağlar
```

Bir oyun dosyası `MG.net` çağırıyorsa mimari bozulmuştur. Oyunlar saf
simülasyondur: girdi alır, durum üretir, çizer. Ağ ve lobi kabuğun işidir.

**Paylaşılan durum tek yerde durur** (`shell/oturum.js`). Modüller kendi
kopyasını tutmaz.

## Minigame sözleşmesi

Yeni bir minigame `games/` altına tek dosya olarak eklenir ve şunu uygular:

```js
MG.oyunlar.<id> = {
  id, ad, kurallar,              // kurallar: tek cümle, tur öncesi perdede çıkar
  kur(tohum, koltuklar),         // tohumdan dünyayı kurar — her istemcide AYNI sonuç
  girdi(d, koltuk, tus, basili), // tuş durumu
  guncelle(d, dt),               // SADECE oda sahibinde çalışır
  anlik(d),                      // yayınlanacak durum (küçük tut)
  uygula(d, s),                  // misafirde gelen durumu uygular
  efekt(d, dt),                  // görsel efektler, her istemcide
  ciz(d, cv, c, koltuklar, benKoltuk), // çizim; benKoltuk kamera/perspektif için
  bitti(d)                       // null | { kazanan: koltuk|null }
};
```

Oyun `d.kalan` alanını tutarsa kabuk süreyi üst barda gösterir.
Kabuğa dokunmadan yeni oyun eklenebilmeli; eklerken kabuğu değiştirmen
gerekiyorsa sözleşme eksik demektir — sözleşmeyi düzelt, özel durum yazma.

## Ağ modeli — pazarlık konusu değil

**Otorite sunucudadır** (`sunucu/`). İstemci hiçbir şey simüle etmez: sadece
tuş girdisi gönderir, gelen durumu yumuşatarak çizer. Botları da sunucu
işletir. Oda sahipliği yalnızca lobi kararlarıdır (kaç tur, hangi oyun,
başlat, bot ekle) — oyun otoritesiyle ilgisi yoktur.

Önce otorite oyunculardan birindeydi; o kişinin girdi gecikmesi sıfır,
ötekilerinki bir gidiş-dönüş kadardı ve fark oynanışta belli oluyordu.

Sunucu oyun dosyalarını `src/`'den aynen yükler (`sunucu/oyunYukle.js`).
Bu yüzden `games/` katmanının ağı ve DOM'u tanımaması üslup tercihi değil,
sunucunun çalışması bu kurala bağlı. **Yeni oyun eklerken `oyunYukle.js`
listesine de ekle**, yoksa sunucu o oyunu bilmez.

İstemcide çizim `requestAnimationFrame`'de, görsel efektler ve geri sayım
`setInterval`'de çalışır. `rAF` arka plan sekmesinde durur; efektler ona
bağlanırsa sekmeye dönüldüğünde birikmiş efektler patlar.

Rastgeleliğin tamamı tohumlu RNG'den gelir (`MG.rngYap`). `Math.random()`
simülasyonda kullanılmaz — sadece görsel efektlerde serbesttir.

## Denge ve ayarlar

Oynanışı etkileyen her sayı `config.js` içindedir. Oyun dosyasına gömülü
sabit sayı bırakma; kod bilmeden oynayarak ayar yapılabilmeli.

## Teknoloji

Vanilla JS + Canvas, klasik `<script>` etiketleri. **ES modül kullanma** —
`file://` altında CORS'a takılır. Derleme adımı, paket yöneticisi, bağımlılık
eklenmez. Görsel dosyası yok; her şey kodda üretilir.

Türkçe adlandırma kullanılır (`guncelle`, `koltuk`, `mermi`).

## Yorumlar

Yorum, kodun söyleyemediği kısıtı anlatır — ne yaptığını değil neden öyle
olduğunu. "Bu satır tankı döndürür" yazma; "rAF arka planda durduğu için
setInterval" yaz.

## Test ve yayın

`node sunucu.js` → http://localhost:8080 (no-store başlıklı, önbellek
sürprizi olmasın diye).

**Commit ve push kullanıcı istemeden yapılmaz.** Kod yazılır, kullanıcı
söyleyince birlikte gönderilir.
