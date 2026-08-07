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
  guncelle(d, dt),               // SADECE sunucuda çalışır
  tahmin(d, koltuk, dt),         // OPSİYONEL — gecikme gizleme, aşağıya bak
  anlik(d),                      // yayınlanacak durum (küçük tut)
  uygula(d, s),                  // misafirde gelen durumu uygular
  efekt(d, dt),                  // görsel efektler, her istemcide
  ciz(d, cv, c, koltuklar, benKoltuk), // çizim; benKoltuk kamera/perspektif için
  bitti(d)                       // null | { kazanan: koltuk|null }
};
```

## Gecikme gizleme (`tahmin`)

`tahmin(d, koltuk, dt)` **yalnızca kendi oyuncunu** ilerletir ve istemcide her
karede çağrılır. Kabuk tuşu sunucuya yollamadan önce yerelde de işler, böylece
tank gidiş-dönüşü beklemeden döner. Uygulayan oyun üç şeye uymalı:

1. Hareket, oyuncunun kendi girdisi ve **durağan** dünya dışında bir şeye
   bağlı olmamalı. Bağlıysa (itiş kakış, çarpışma) tahmin sapar; sapma
   düzeltmesi bunu toparlar ama sertleşir.
2. **Kalıcı sonuç üretilmez** — mermi doğurmak, puan vermek, öldürmek yok.
   Sunucu zaten üretiyor; tahmin de üretirse aynı şey iki kez olur.
3. Her adımda `MG.tahmin.pozKaydet` çağrılmalı; `uygula` kendi koltuğu için
   `MG.tahmin.duzelt`, `efekt` için `MG.tahmin.erit` kullanmalı.

`d.tahminKoltuk` kabuk tarafından yazılır (oyun `tahmin` sunmuyorsa `-1`), yani
uygulamayan oyunlar hiçbir şey değiştirmeden eskisi gibi çalışır.

Kritik nokta `src/core/tahmin.js` başında yazılı: sunucudan gelen konum ŞU ANKİ
tahminle değil, **o konumun ait olduğu andaki** tahminle karşılaştırılır. Yoksa
oyuncu her pakette geriye çekilir ve tahminin faydası kaybolur.

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

Arkadaşlarla oynamak için `baslat.ps1` (masaüstündeki kısayol onu çağırır):
oyun sunucusunu başlatır, tüneli açar, adresi `config.js`'e yazıp yayına
gönderir. Sunucu ve tünel pencereye bağlı başlatılır — pencere kapanınca
ikisi de kapanır, ortada zombi süreç kalmaz. Tünel oyun ortasında düşerse
betik fark edip yeniden kurar.

Önce **Cloudflare** tüneli denenir, olmazsa **localhost.run**'a düşülür.
Ölçüm (Sakarya'dan, oyunun tam gidiş-dönüşü): Cloudflare **82 ms**,
localhost.run **336 ms**. Fark çıkış noktasından: Cloudflare'inki İstanbul,
localhost.run'unki Virginia. Yedek yol oyunu oynanır tutar ama yavaştır.

**WARP açıkken Cloudflare tüneli kurulamıyor** — 7844 portu kapanıyor ve
cloudflared adresi bassa da istekler 530 dönüyor. Bu yüzden tünel yalnızca
adrese bakarak değil, dışarıdan sağlık sorgusuyla doğrulanır.

**Commit ve push kullanıcı istemeden yapılmaz.** Kod yazılır, kullanıcı
söyleyince birlikte gönderilir.
