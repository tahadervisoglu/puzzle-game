# Minigames — 5 kişilik parti oyunları

Tarayıcıda oynanan, 5 kişiye kadar kısa minigame'ler. **Kod yok, davet yok:**
adını yaz, "Oyna"ya bas. Açık bir oda varsa oraya düşersin, yoksa odayı sen
kurarsın. Herkes gelince oda sahibi kaç tur oynanacağını seçip başlatır.

**▶ Oyna: https://tahadervisoglu.github.io/puzzle-game/**

## Nasıl oynanır

Bir seri 3, 5 ya da 8 turdan oluşur. Her tur **farklı** bir minigame gelir —
oyunlar karıştırılmış bir havuzdan çekildiği için aynısı tekrar etmez. Her
turun sonunda sıralamaya göre puan dağıtılır (1. üç, 2. iki, 3. bir puan),
seri bitince toplam puanı en yüksek olan şampiyon olur.

Hareket **WASD ya da ok tuşlarıyla**, her oyunun özel eylemi **Boşluk** ile.
Kendi karakterinin üstünde kendi renginde bir ok durur, kalabalıkta kaybolmazsın.

Test için oda sahibi boş koltuklara bot ekleyebilir; kimse eklemezse bot yoktur.

## Oyunlar

| Oyun | Kontrol | Kazanma |
|---|---|---|
| **Tank Düellosu** | WASD/oklar + Boşluk: ateş | Son kalan |
| **Kutu Kapmaca** | WASD/oklar: forklift · Boşluk: kaldır/bırak | 30 sn'de en çok kutu |
| **Şimşek Refleks** | Boşluk: kap | En çok puan (bombaya ve eksiye dokunma) |
| **Araba Yarışı** | WASD/oklar: sür | 2 turu ilk bitiren |
| **Çember Kaçış** | A / D ya da ← → | Lazerlerden son kurtulan |
| **Yokuş Aşağı** | Boşluk: zıpla | 30 sn sonunda en öndeki |
| **Örümcek Kaç** | WASD/oklar + Boşluk: örümceği fırlat | Fitil patlamadan kaçan son kişi |
| **Buz Sumo** | Boşluk basılı: güç topla, bırak: fırla | Arenada kalan son kişi |

## Çalıştırma

`index.html` çift tıklanınca da açılır. Geliştirirken tarayıcı önbelleği
yüzünden olmayan hatayı aramamak için:

```bash
node sunucu.js
```

Sonra http://localhost:8080 — `no-store` başlığıyla sunar.

Çok oyunculu oynamak için sayfanın **https** adresinde olması şart, WebRTC
bunu istiyor. GitHub Pages bunu karşılıyor.

---

Aşağısı, projenin ağ tarafının **neden böyle kurulduğunu** anlatıyor.
Bu mimari [Puzzle Party](https://github.com/tahadervisoglu/puzzle-game/tree/main~1)
projesinde çalışır durumda kanıtlandı; oradaki tuzaklar da burada yazılı.

---

## Teknoloji tercihi

Derleme yok, paket yöneticisi yok, sunucu yok. Vanilla JS + Canvas, klasik `<script>` etiketleri. Sebep: `index.html` çift tıklanınca çalışıyor, GitHub Pages'e atınca yayına giriyor, arada hiçbir adım yok.

> ES modül **kullanma**. `file://` altında CORS'a takılıyor ve "çift tıkla çalışsın" özelliğini kaybediyorsun.

Yayınlama: GitHub Pages (public repo, `main` dalı, kök dizin). `git push` yeterli, ~1 dakikada canlıya çıkar. Çok oyunculu için sayfanın **https** adresinde olması şart — WebRTC bunu istiyor.

---

## Ağ mimarisi

### Temel karar: her istemci kendi oyuncusunu simüle eder

Minigame'lerde oyuncular birbirine fiziksel olarak temas ediyorsa (tank mermisi, araba çarpışması) bu karar değişir — o zaman **otorite tek yerde** olmalı. İki seçenek:

- **Bağımsız durumlar** (yapboz gibi): herkes kendi durumunu simüle eder, sadece özet yayınlar. En basiti.
- **Host otoritesi** (tank/yarış gibi): oda sahibi tüm dünyayı simüle eder, diğerleri sadece **girdi** gönderir ve gelen durumu çizer. Çarpışma olan her oyunda bunu seç.

Minigame'ler için **host otoritesi** doğru yol. Girdi paketleri küçüktür (bir düğme!), host dünyayı işletir, herkese durum yayınlar.

### Topoloji: yıldız

Herkes oda sahibine bağlanır, oda sahibi mesajları dağıtır. Tam ağ (herkes herkese) düzeninden çok daha az şey ters gider ve host otoritesiyle zaten örtüşür.

### Kütüphane

PeerJS, CDN'den ve **tembel** yüklenir — "Oda kur"a basılana kadar indirilmez, böylece tek kişilik oyun internetsiz de açılır.

```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

### Otomatik eşleşme (oda kodu yok)

Önce 4 karakterlik oda kodu ve davet linki vardı; kod okumak/yazmak parti
oyununun önüne geçtiği için kaldırıldı. Yerine **sabit bir kimlik havuzu**
kullanılıyor:

- Peer id = `minigames-oda-1` … `minigames-oda-4`
- "Oyna"ya basan sırayla bu odalara bağlanmayı dener
- Bağlanabilirse katılır; `peer-unavailable` gelirse o kimliği alıp **kendisi
  oda sahibi olur**; oda doluysa sıradakini dener
- İki kişi aynı anda basarsa biri `unavailable-id` alır — o da sıradaki odaya
  geçer, yarış durumu böyle çözülür

Cevap gelmezse oda boş sayılır (`odaDenemeMs`); `conn.on('open')` hiç
tetiklenmeyebildiği için bu zaman aşımı şart.

### Zorunlu: bağlantı zaman aşımı

`conn.on('open')` hiç tetiklenmeyebilir. **15 saniyelik bir zamanlayıcı koy**, dolunca anlamlı hata ver. Yoksa ekranda sonsuza kadar "Bağlanılıyor" yazar ve kullanıcı neyin yanlış olduğunu asla bilemez.

### Zorunlu: her denemeden önce durumu sıfırla

Kullanıcı önce "Oda kur"a, sonra "Katıl"a basarsa eski peer ayakta kalır ve bağlantı katmanı bozulur. `host()` ve `join()` en başında eski peer'ı yok etsin.

---

## TURN — en çok vakit kaybettiren konu

Ev bağlantılarının çoğu (CGNAT) iki tarayıcının doğrudan bağlanmasına izin vermiyor. STUN yetmez; trafiği aktaran bir **TURN** sunucusu gerekir. Bu ayarlanmadan **hiçbir arkadaşın bağlanamaz** — oda kodu üretilir ama bağlantı kurulmaz.

### Çalışan yapılandırma (Metered, ücretsiz plan)

```js
net: {
  turn: {
    host: 'global.relay.metered.ca',          // TURN sunucusu
    apiHost: 'puzzlegameaa.metered.live',     // panel/API adresi (AYRI!)
    username: '7ea849840c346367c20aa635',
    credential: 'zioLuy8n7tYIpf94'
  },
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

Bunlar deneme hesabına ait, paylaşmakta sakınca yok. Kota dolarsa ya da yavaşlarsa panelden yeni kimlik bilgisi üretilir.

### ⚠️ İki tur kaybettiren tuzak

**TURN sunucusunun alan adı, panelin alan adıyla aynı değildir.** Panelin `<uygulama>.metered.live` olsa bile TURN adresleri `global.relay.metered.ca` üzerindedir. Karıştırırsan hiç `relay` adayı üretilmez, `701` hatası alırsın ve sebebini bulmak saatler alır.

En garantisi: panelde kimlik bilgisinin yanındaki **"Show ICE Servers Array"** çıktısını olduğu gibi yapıştırmak.

### Adresleri hep birlikte dene

Bazı ağlar sadece 443/TCP'ye izin veriyor:

```js
urls: [
  'turn:' + host + ':80',
  'turn:' + host + ':80?transport=tcp',
  'turn:' + host + ':443',
  'turns:' + host + ':443?transport=tcp'
]
```

### Bağlantı testi düğmesi yaz — ilk günden

Tek başına çalışan, karşı tarafa ihtiyaç duymayan bir test. `RTCPeerConnection` açıp aday topluyor ve üç katmanı ayrı ayrı raporluyor:

```
Kendi adresim (host)   : var
Dış adresim (STUN)     : çalışıyor
Aktarıcı (TURN)        : çalışıyor
```

`relay` adayı yoksa TURN çalışmıyor demektir. Bu düğme olmadan hata ayıklamak kör dövüşü; olunca on saniyede cevap veriyor.

---

## Senkron reçetesi

### Koltuk ≠ ekran yeri

Koltuk numarası **ağdaki kimliktir**, ekran yeri ise nereye çizildiğidir. Her istemcide kendi koltuğu 1. yere eşlenir; herkes kendini aynı yerde görür ve ekran düzenine hiç dokunmak gerekmez.

### Ortak tohum

Rastgeleliğin tamamı seeded RNG'den gelsin. Oda sahibi başlatırken tohumu `basla` mesajıyla yollar; harita, engeller, hava durumu, hatta oyun içi görseller aynı tohumdan üretilir. Böylece **ayrıca bir dünya senkronu yazmana gerek kalmaz.**

### Sahiplik kuralı

Her istemci **yalnızca sahip olduğu** oyuncuların durumunu değiştirir; başkasınınki zaten karşıdan gelir. Botları **oda sahibi** simüle eder, misafirlerde tüm diğer koltuklar uzaktır — yoksa botlar her makinede farklı oynar.

Görsel etkiler (ekran karartma, titreşim) bu kuraldan muaf tutulabilir; oyunu bozmazlar.

### Durum yayını

- Sabit aralıkla değil, **değiştiğinde** gönder. TURN'den geçen her bayt kotadan düşüyor.
- Değişmese bile ~1,2 saniyede bir **nabız** gönder (aşağıdaki kopma tespiti buna dayanıyor).
- Piksel gönderme, **oranlı konum** gönder. Panel boyutları her makinede farklı.

### Kopma tespiti

**WebRTC, sekme kapandığını bildirmiyor.** `conn.on('close')` çoğu zaman hiç tetiklenmez. Akan durum mesajlarını nabız say, ~4 saniye sessizlikte oyuncuyu düşmüş kabul et.

### Eylemler

Bir oyuncunun eylemi (ateş, kart, çarpma) **hedefiyle birlikte açıkça** gönderilsin. "Lidere at" gibi bir kural karşı tarafta farklı hesaplanabilir ve iki istemci farklı sonuca varır.

---

## Minigame iskeleti

Kabuk (lobi, ağ, puan tablosu, tur akışı) bir kez yazıldı; minigame'ler ona
takılıyor. Sözleşmenin güncel hâli ve uyulması gereken kurallar
[AGENTS.md](AGENTS.md) içinde. Özeti:

```js
MG.oyunlar.tank = {
  id, ad, kurallar,              // kurallar: tek cümle, tur öncesi perdede çıkar
  kur(tohum, koltuklar),         // tohumdan dünyayı kurar — her istemcide AYNI
  girdi(d, koltuk, tus, basili),
  guncelle(d, dt),               // SADECE oda sahibinde çalışır
  anlik(d), uygula(d, s),        // durum yayını / misafirde uygulama
  efekt(d, dt), ciz(d, cv, c, koltuklar, benKoltuk),
  bitti(d)                       // null | { kazanan: koltuk|null }
};
```

Yeni minigame eklemek ağ koduna dokunmayı gerektirmiyor: dosya `games/`
altına konur, `index.html`'e bir `<script>` satırı eklenir, lobide
kendiliğinden listelenir.

Klasör:

```
config.js   tüm denge sayıları — kod bilmeden oynayarak ayar yapılabilir
src/
  core/     tohumlu rng, prosedürel ses, geometri
  net/      PeerJS bağlantısı, ICE/TURN, bağlantı testi
  shell/    oturum durumu, arayüz, lobi, tur akışı
  games/    tank, forklift, refleks, yaris, cember, yokus, orumcek, sumo
  ui/       stil
```

---

## Kural tek cümle olmalı

Parti oyununda kuralı okumaya kimse zaman ayırmaz. Her minigame'in
`kurallar` alanı tek satırdır ve tur başındaki geri sayım perdesinde
oyun adıyla birlikte gösterilir — üç saniyelik bu ekran herkesi hizaya
sokuyor.

Kontroller oyunlar arasında bilinçli olarak benzer tutuldu: WASD hareket,
Boşluk o oyunun "özel" eylemi (ateş, kaldır, kap, zıpla, fırlat, güç topla).

---

## Diğer öğrenilenler

- **Prosedürel ses.** WebAudio ile anında üretilen kısa sesler dosya indirmeden çok iş görüyor. Ses, "juice"un yarısı.
- **Görseli de kodda üret.** Hiçbir görsel dosyası olmayan bir proje tek klasörde kalıyor, yükleme beklemesi olmuyor.
- **Tarayıcı önbelleği.** Geliştirirken `no-store` başlığı gönderen küçük bir sunucu kullan; yoksa eski dosyayı sunar ve olmayan hatayı ararsın.
- **Sekme arkadayken `requestAnimationFrame` durur.** Test ederken şaşırma; `setInterval` çalışmaya devam eder.
- **Ses ilk kullanıcı hareketinden sonra açılır.** İlk tıklamada `AudioContext`'i başlat.
- **Denge sayılarının tamamı tek dosyada dursun.** Kod bilmeden oynayarak ayar yapabilmek, tasarımın en hızlı ilerlediği yer oldu.

---

## İlk adımlar

1. Klasörü git deposu yap, GitHub'a public olarak yolla, Pages'i aç
2. Kabuğu kur: lobi + ağ + bağlantı testi (yukarıdaki reçete)
3. **Bağlantı testini erken çalıştır**, TURN'ün çalıştığını gör
4. Tek bir minigame ile uçtan uca bir tur oynat
5. Sonra minigame eklemeye başla — ağ koduna bir daha dokunmayacaksın
