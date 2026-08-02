# Puzzle Party — prototip

Tricky Towers'ın büyü gerilimini yapboza taşıyan 4 kişilik rekabetçi yapboz. Tasarımın tamamı [DESIGN.md](DESIGN.md) içinde.

**Şu anki durum: F4 — dört faz da tamam. Oyun oynanabilir ve cilalı.**

Oyun açılınca bir mod seçersin:

- **Klasik (ana mod)** — herkese kendi parçaları düşer (3 saniyede bir). Yarış tempo ve hatasızlık üzerine.
- **Ortak havuz** — parçalar alttaki ortak havuza düşer, dördünüz de oradan kaparsınız. İhtiyacın olanı rakipten önce tıklaman gerekir. Masanda en fazla 6 parça bekleyebilir, dolunca yerleştirmeden yeni parça alamazsın.

Tur bitince "mod değiştir" ile diğerine geçebilirsin.

## Arkadaşlarla oynama (F5)

Başlangıç ekranının altındaki **Arkadaşlarla oyna** bölümünden:

- **Oda kur** → 4 karakterlik bir oda kodu çıkar, arkadaşlarına gönderirsin
- **Katıl** → kodu yazıp odaya girersin

Lobide kimlerin geldiğini görürsünüz, oda sahibi başlatır. Boş koltukları bot doldurur, yani 2 kişi de oynayabilirsiniz. Herkes kendini sol üstteki büyük panelde, diğerlerini küçük panellerde görür. İsimler otomatik: Oyuncu 1-4.

**Kurulum gerekmiyor.** Sunucu kiralamıyorsun, hesap açmıyorsun. Oyuncular birbirine doğrudan bağlanıyor (WebRTC); araya sadece tarayıcıları tanıştıran ücretsiz bir servis giriyor. Bağlantı kütüphanesi de ancak "Oda kur" ya da "Katıl" tıklandığında indiriliyor — **tek kişilik oyun internetsiz de çalışmaya devam eder.**

Arkadaşlarının oyunu açabilmesi için sayfanın bir https adresinde durması gerekir (GitHub Pages ya da Netlify, ikisi de ücretsiz). Kendin test etmek için iki tarayıcı penceresi açıp birinde oda kurup diğerinde katılabilirsin.

### "Bağlanılıyor"da takılırsa

Oda kodu üretiliyor ama bağlantı kurulmuyorsa sorun kod değil **ağ**. Ev bağlantılarının çoğu (özellikle CGNAT kullananlar) iki bilgisayarın doğrudan birbirine bağlanmasına izin vermiyor. Bunun için trafiği aktaran TURN sunucuları [config.js](src/core/config.js) içinde tanımlı.

Oradaki aktarıcılar ücretsiz ve herkese açık — yoğunlukta yavaşlayabilir ya da tamamen kapanabilir. Hâlâ bağlanamıyorsanız yapılacaklar sırasıyla:

1. Biriniz mobil veri / farklı bir ağ deneyin (sorunun ağ kaynaklı olduğunu doğrular)
2. `config.js` içindeki `net.iceServers` listesine kendi TURN bilgilerinizi yazın
3. Kalıcı çözüm: WebRTC yerine küçük bir WebSocket röle sunucusu — herkes sunucuya dışa doğru bağlandığı için NAT hiç devreye girmez

Bağlantı 15 saniyede kurulamazsa oyun artık sonsuza kadar beklemek yerine hata veriyor.

**F5'te olanlar:** oda kurma/katılma, lobi, ortak seed ile senkron başlangıç, canlı ilerleme çubukları.
**F6'da eklenenler:** rakiplerin tahtalarını canlı görmek, büyülerin karşı tarafa geçmesi, tur bitişi senkronu, düşen oyuncu bildirimi.

## Çalıştırma

`index.html` dosyasına çift tıkla, o kadar. Kurulum, derleme, sunucu yok.

Sunucu üzerinden açmayı tercih edersen:

```bash
python -m http.server 5300
```

Sonra tarayıcıda `http://localhost:5300` adresine git.

## Nasıl oynanır

Ekran 4 panele bölünür: sol üstteki büyük panel senin, diğer üçü botların canlı görünümü. Ortada, dört panelin kesiştiği yerde ortak referans resmi durur (F3'te Sis büyüsü bunu gizleyecek).

- **Sol tık sürükler.** Parçayı ızgara hücresine yakın bırakırsan cuk oturur. Doğru da olsa yanlış da olsa oturur — oyun hangisinin yanlış olduğunu söylemez.
- **Izgara dışında parçalar birbirine yapışır.** İki parçayı hizalayıp bırakırsan birleşirler ve tek parça gibi taşınırlar. Birleşmiş kümeyi ızgaraya sürüklersen hepsi tek hamlede oturur.
- **Sağ tık kümeden tek parça koparır.**
- **Parçalar:** klasik modda 3 saniyede bir masana düşer; havuz modunda alttaki havuzdan tıklayarak kaparsın.
- Panel başlıklarındaki çubuk doğru yerleşen parça oranını gösterir; lider turuncu yanar. Yapbozu ilk doğru tamamlayan turu kazanır.

### Büyüler

Her %10 doğru parçada önüne **iki kart** çıkar: biri ışık (kendine fayda), biri karanlık (rakibe sabotaj). Birini seçersin ve **büyü anında çalışır** — cepte bekletme yok. Fare ile tıklayabilir ya da **1** (ışık) / **2** (karanlık) tuşlarını kullanabilirsin. Karanlık büyüler otomatik olarak **lidere** gider.

| Büyü | Tür | Etki |
|---|---|---|
| Çifte teslimat | ışık | Anında 2 parça alırsın (havuzda kaparsın, klasikte düşer) |
| Kontrol | ışık | Yanlış oturan parçaların 3 sn kırmızı yanar |
| Poster | ışık | Tam resim 5 sn ızgaranın üstünde belirir, sonra sönerek kaybolur |
| Sis | karanlık | Ortak referans 5 sn gizlenir — atan hariç herkese |
| Rüzgar | karanlık | Hedefin tek duran parçaları savrulur (birleşmiş kümeler korunur) |
| Karartma | karanlık | Hedefin paneli 6 sn kararır, imleç çevresi fener gibi kalır |
| Hırsız | karanlık | Hedefin masasından 2 parça çalarsın (klasikte parça hedefe sonra geri gelir) |
| Kilit | karanlık | Hedefin parça akışı 5 sn durur |
| Deprem | karanlık | Hedefin ızgarasından 3 parça sökülüp masaya savrulur |
| Takas | karanlık | Hedefin ızgarasında iki parçanın yeri değişir — nerede olduğunu bilmez |
| Yapıştır | karanlık | Hedefin masadaki parçaları tek yığına yapışır, sağ tıkla ayırması gerekir |

Deprem, Takas ve Yapıştır rakibin **kazandığı ilerlemeyi geri alan** büyüler. Takas en sinsisi: tahtası dolu görünmeye devam eder ama doğru sayısı düşer — nerede bozulduğunu bulmak için Kontrol büyüsüne ihtiyacı olur.

Saldırılar hedefin ekranında **1 saniye önceden uyarı verir** — Tricky Towers'ı adil hissettiren şey saldırıların okunabilir olması. Aynı hedefe 20 saniye içinde aynı büyü ikinci kez gelirse etkisi yarıya iner. Son sıradaki oyuncunun kart sayacı daha hızlı dolar ve ona daha sert karanlık kartlar çıkar.

Ses varsayılan olarak açık; başlıktaki **ses açık / ses kapalı** düğmesiyle kapatabilirsin. Tüm sesler kodda üretiliyor, indirilen dosya yok.

## Neyi test etmelisin

- **Büyüler eğlenceli mi?** Hangisi tatmin edici, hangisi sönük kalıyor?
- Kart temposu doğru mu — çok sık mı geliyor?
- 1 saniyelik uyarı yeterli mi, saldırıya tepki verebiliyor musun?
- Bot zorluğu dengeli mi — kazanabiliyor musun?
- 15 parça makul mü, yoksa 24-30 mu olmalı?

**Bilinen iki denge notu:**

1. 15 parçada %10 eşiği çok sık kart veriyor (~1,5 parçada bir). Parça sayısını artırınca kendiliğinden düzelir.
2. Tüm parçalar ~42 saniyede geldiği için o andan sonra Çifte Teslimat ve Hırsız hiçbir şey yapmıyor. Parça sayısı artarsa sorun kalmaz.

## Ayarlar paneli

`T` tuşuna bas (ya da başlıktaki "ayarlar" düğmesine tıkla). Sütun, satır, parça aralığı, ızgara toleransı, yapışma toleransı, **bot hızı** ve **bot hatası** canlı ayarlanır. "hepsini getir" beklemeden tüm parçaları masaya döker.

Beğendiğin değerleri kalıcı yapmak için [src/core/config.js](src/core/config.js) dosyasına yaz — tüm denge sayıları orada.

**Dikkat:** parça aralığı × parça sayısı turun teorik alt sınırıdır (3 sn × 15 ≈ 39 sn). Bot düşünme süresi bu aralığın altına inerse bot parçayı gelir gelmez yerleştirir ve onu geçmen imkânsız olur. Damlama aralığını değiştirirsen bot hızını da ayarla.

## Yapı

```
src/
  core/     döngü, seeded rng, event bus, config
  puzzle/   prosedürel resim, dilimleme, ızgara, kümeler, masa
  players/  oyuncu birimi, girdi, insan denetleyicisi, bot
  skills/   büyü tanımları, kart dağıtımı ve efekt sistemi
  net/      bağlantı katmanı ve lobi (sadece multiplayer'da yüklenir)
  render/   canvas çizimi, efekt katmanı, prosedürel ses
  ui/       stil, ayar paneli
```

Yeni büyü eklemek [src/skills/skills.js](src/skills/skills.js) içine tek bir nesne yazmaktan ibaret: `{id, name, type, desc, apply(ctx)}`. Oyun mantığının büyülerden, büyülerin de birbirinden haberi yok — kart dağıtımı, hedefleme, uyarı gecikmesi ve spam freni [skillsystem.js](src/skills/skillsystem.js) tarafında hallediliyor.

Her oyuncu bağımsız bir `Player`: kendi masası, ızgarası, kümeleri ve canvas'ı var. İnsan ile bot arasındaki tek fark onu süren denetleyicidir — ikisi de aynı masa API'sini kullanır. Bu yüzden ileride gerçek çok oyunculuya geçmek denetleyiciyi ağdan beslemekten ibaret olacak.

Girdi katmanı doğrudan oyun durumu değiştirmez, `niyet:tut` / `niyet:tasi` / `niyet:birak` olayları yayar. Simülasyon sabit adımda ilerler, çizim ondan bağımsızdır; rakip panelleri her 3 karede bir çizilir.

## Sonraki adım

Dört faz da tamamlandı. Buradan sonrası oynayıp karar vermeye bağlı. Sıradaki adaylar:

- **Parça sayısı** 15'ten 24-30'a — kart temposu ve ölü büyü sorunlarını çözer
- Gerçek görsel seti (şu an resim koda çiziliyor)
- Ses
- Gamepad ile 4 gerçek oyuncu (girdi katmanı buna hazır)
- Kalan tasarlanmış büyüler: İpucu, Mıknatıs, Kalkan, Turbo, Ayna, Sahte parça
