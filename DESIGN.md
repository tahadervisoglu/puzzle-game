# Puzzle Party — Tasarım Dokümanı

Tricky Towers'ın büyü gerilimini yapboza taşıyan, 4 kişilik, bölünmüş ekranlı rekabetçi yapboz oyunu. JS prototip (vanilla JS + Canvas 2D).

## İki mod

Oyun başında iki moddan biri seçilir. İkisi de aynı ızgara, küme ve büyü sistemini kullanır; fark **parçaların nereden geldiğidir**.

**Klasik.** Herkese kendi parçaları düşer, 3 saniyede bir. Parça sırası herkeste aynı. Yarış tamamen tempo ve hatasızlık üzerine; rakiple tek teması büyüler.

**Ortak havuz.** Parçalar kimseye ait değil: ekranın altındaki ortak havuza düşer, dört oyuncu da oradan kapar. İhtiyacın olan parçayı rakipten önce tıklaman gerekir. Bu mod oyunu yapbozdan çıkarıp doğrudan temaslı bir parti oyununa çeviren şey — büyülere gerek kalmadan rakiple çekişirsin.

Havuz modunun iki kuralı var:
- **Tepsi sınırı (6):** masanda bekleyen parça sayısı sınıra ulaşınca yeni parça kapamazsın. Yoksa hızlı oyuncu her şeyi toplar ve diğerleri aç kalır. Sınır, kapmayı yerleştirme hızına bağlar.
- **Elindekini alamazsın:** zaten sahip olduğun parça havuzda sönük görünür. Torba mantığı (15 parça karılır, bitince yeniden karılır) hiçbir parçanın uzun süre ortadan kaybolmamasını sağlar.

## Çekirdek döngü

- Herkes aynı resmin aynı kesimli yapbozunu yarışarak dizer. Parça sırası herkese aynı gelir (seeded RNG) — fark şans değil, hız ve büyü yönetimi.
- Parçalar **kare** (jigsaw kenarı yok) ve masanın kenarlarına saçılır. Geliş şekli moda göre değişir (yukarıya bak).
- Ortada **ızgara** var: parçalar kenarlara saçılır, ortadaki hücrelere sürüklenir. Hücrenin yakınına bırakılan parça **cuk diye oturur — doğru ya da yanlış**. Oyun hangisinin yanlış olduğunu söylemez; sadece toplam ilerleme görünür ("yerleşen 8/15 · doğru 5"). Parça istenildiği an sökülüp taşınabilir, hücre boşalır.
- **Dolu hücreye bırakma = yer değiştirme.** Izgaradan alınan parça başka bir parçanın hücresine bırakılırsa ikisi takas olur (parçanın geldiği hücre saklanır). Masadan gelen parça dolu hücreye bırakılırsa oradaki parça masaya çıkar. Önceden bu durumda hiçbir şey olmuyordu, parça hücrenin üstünde asılı kalıyordu — yanlış yerleştirilen iki parçayı düzeltmek gereksiz yere zahmetliydi. Sürüklerken hedef turuncu kesikli çerçeveyle önceden gösterilir.
- **Izgara dışında serbest birleştirme:** kenardaki parçalar birbirine yapıştırılıp küme yapılabilir. Küme tek parça gibi taşınır ve ızgaraya tek hamlede oturur (tüm hücreler boşsa). **Sağ tık** kümeden tek parça koparır.
  - Yapışma toleransı ızgaradan dar (%30'a karşı %55) ve sadece parça gerçekten sürüklendiğinde denenir — yan yana park edilen parçalar kazara birleşmesin, oyuncu isteyerek hizalasın diye.
  - Rüzgar büyüsü (F3) buna göre: hücreye oturmamış parçaları savurur, küme olanları daha az etkiler — erken birleştirmek koruma sağlar.
- Referans (orijinal) resim **ekranın tam ortasında, 4 panelin kesişiminde ortak** durur.
- **Döndürme yok** — parçalar hep doğru yönde gelir (ileride "zor mod" seçeneği olabilir).
- **Zafer: Yarış modu** — yapbozu ilk doğru tamamlayan kazanır. (Süreli mod ileride eklenebilir.)

## Büyü ekonomisi

- İlerleme = doğru birleştirilmiş parça yüzdesi. Her **%10 eşiğinde** 2 kart belirir: biri ışık (kendine fayda), biri karanlık (rakibe sabotaj). **Seçilen büyü anında uygulanır** — cep/bekletme yoktur. Bu bilinçli bir sadeleştirme: "doğru anı bekleme" katmanı kalktı, oyun hızlandı ve kart geldiğinde anında karar verme baskısı arttı.
- **Süre uzadıkça eşikler küçülür** (%10 → %9 → %8...) — oyun uzarsa büyüler sıklaşır, kimse büyüsüz kalmaz.
- **Yetişme mekaniği:** geride kalan oyuncuya kart seçiminde daha güçlü karanlık seçenekler çıkar; ayrıca karanlık büyüler varsayılan olarak lidere gider.
- **Spam freni:** aynı hedefe 20 sn içinde aynı büyü ikinci kez gelirse yarı etki.
- **Okunabilirlik:** her saldırı hedefin ekranında ~1 sn önceden uyarı verir ("Rüzgar geliyor!").

## Büyü listesi

| Büyü | Tür | Etki | Not |
|---|---|---|---|
| Çifte teslimat | Işık | Anında 2 ekstra parça | Temel ekonomi büyüsü |
| Kontrol | Işık | 3 sn boyunca yanlış oturan parçalar kırmızı yanar | Yanlışı bulmak stratejinin parçası |
| İpucu | Işık | Elindeki bir parçanın gitmesi gereken bölge parlar | Yeni oyuncu dostu |
| **Poster** | Işık | Tam resim 5 sn ızgaranın üstünde %60 saydamlıkla belirir, son 1,4 sn sönerek kaybolur | Ortadaki madalyon küçük kaldığı için eklendi |
| Mıknatıs | Işık | 12 sn yerleştirme toleransı 2 katı | Hız oyuncusuna |
| Kalkan | Işık | Sıradaki saldırıyı yutar | Saldırı spam'ine fren |
| Turbo | Işık | 15 sn parça gelişi 2 kat hızlı | Çifte teslimatın süreli hali |
| Sis | Karanlık | Ortadaki referans 5 sn gizlenir — atan hariç herkese | 3 rakibi birden vurur; nadir çıkmalı |
| Rüzgar | Karanlık | Atan hariç herkesin tekil parçaları masada savrulur | Ortam olayı; birleşmiş kümelere işlemez |
| Karartma | Karanlık | Hedefin paneli kararır, imleç çevresi fener, 6 sn | Görsel şov |
| Ayna | Karanlık | Hedefin gördüğü referans 8 sn yatay ters | Sinsi — fark etmeyebilir |
| Hırsız | Karanlık | Hedefin sıradaki parçasını çalar, sana gelir | Zarar değil transfer |
| Yapışkan | Karanlık | Hedefin sürükleme hızı %50, 6 sn | Hafif ama sinir bozucu |
| Sahte parça | Karanlık | Hedefe hiçbir yere oturmayan 2 parça | Masayı kirletir |
| **Kilit** | Karanlık | Hedefin parça akışı 5 sn durur | Her iki modda çalışır |
| **Deprem** | Karanlık | Atan hariç herkesin ızgarasından 2 parça sökülür | Ortam olayı; üç kişiyi birden vurduğu için 3 yerine 2 parça |
| **Takas** | Karanlık | Hedefin ızgarasında iki parçanın yeri değişir | **Görünmez hasar** — tahta dolu görünür, ilerleme düşer |
| **Yapıştır** | Karanlık | Hedefin masadaki parçaları tek yığına yapışır | Sevilen mekaniği cezaya çevirir |

**Neden bu son üçü önemli:** F3'e kadar hiçbir büyü rakibin ızgarasına dokunmuyordu, yani kazanılmış ilerleme asla geri alınamıyordu — oyun "yapboz yarışı + görsel taciz" olarak kalıyordu. Deprem, Takas ve Yapıştır bu deliği kapatıyor. Özellikle Takas, "oyun sana yanlışını söylemez" kuralıyla birleşince Kontrol ışık büyüsünü zorunlu hale getiriyor.

Bilinen emergent etkileşim: Yapıştır hedefin parçalarını tek kümede topladığı için onu Rüzgar'a karşı korur (Rüzgar birleşmiş kümelere işlemez). Komik bir yan etki, şimdilik dokunulmadı.

### Juice (F4)

Panel başına efekt katmanı (`src/render/fx.js`): sarsıntı, partikül, renk parlaması. Büyüler ne olacağını bilmez — sadece "şu oyuncuda şu şey oldu" der, görsel karşılığı `PP.fxFor` içinde durur.

- Deprem → güçlü sarsıntı + turuncu parlama + sökülen parçanın yerinden toz
- Rüzgar → paneli boydan boya geçen savrulma çizgileri
- Takas → mor parlama (nerede bozulduğu belli olmaz)
- Yapıştır / Hırsız / Kilit / Sis / Karartma → kendi renginde parlama
- Parça ızgaraya oturunca kendi konumunda halka + toz + kısa sıçrama
- Ekranın üstünde **büyü duyuruları**: "Bot 1 → sana · Deprem". Büyüler görünmezse oyun rastgele hissettirir.

### Tokluk katmanı (F7)

**Ses — prosedürel.** Dış dosya yok; her ses WebAudio ile anında üretilir (`src/render/audio.js`). Yeni ses eklemek tarif tablosuna bir satır yazmak demek. Tarayıcılar sesi kullanıcı hareketinden sonra açtığı için ilk tıklamada başlatılır. Sadece **beni ilgilendiren** olaylar duyulur — kendi hamlelerim ve bana gelen saldırılar; yoksa dört panelin sesi gürültüye döner.

**Parça uçuşu.** Rüzgar ve Deprem'de parçalar yeni yerlerine ışınlanmıyor. Oyun mantığı parçayı anında taşınmış sayar, ama parçada `rx/ry` çizim kayması tutulur ve sönerek sıfırlanır — göz uçuşu görür, mantık bozulmaz. Aynı ayrım sayesinde ağ senkronu ve çarpışma hesapları etkilenmez.

**Yerleşme tokluğu.** Parça hücreye otururken `pop` ile şişip sönüyor, hücrede halka yayılıyor, parçanın kendi konumunda toz çıkıyor ve panel hafifçe sarsılıyor. Önceden toz sabit bir noktadan çıkıyordu, düzeltildi.

## Ekran düzeni

- CSS grid: sol üst panel %62 × %58 (oyuncunun kendisi), diğer 3 panel küçük **seyirci görünümleri** — ayrı oyun değil, aynı simülasyonun küçültülmüş render'ı. Panel boyutu farklı olduğu için parça boyutu her panelde otomatik küçülür.
- Ortada referans madalyonu (4 panelin kesişim noktası).
- Rakipler: **3 bot** (zorluk = düşünme süresi + hata payı). İleride Gamepad API ile 4 gerçek oyuncu.
- Parça geliş sırası herkeste aynı (ortak rng akışı), saçılma konumları panele özel — adalet bozulmadan her panel kendi boyutuna uyar.
- Lider çubuğu turuncu yanar; biten oyuncunun paneli çerçevelenir.

### Botlar ve karanlık büyüler

Bot referans resme bakmaz (doğru cevabı zaten bilir), o yüzden Sis ve Karartma botlara karşı anlamsız kalırdı. Çözüm: bu büyüler botun **hata oranını ve düşünme süresini** yükseltiyor — Sis ×3 hata / ×1,3 yavaşlama, Karartma ×2,5 hata / ×1,6 yavaşlama. Görsel etki insanda, istatistik etkisi botta; ikisi de aynı şeyi ifade ediyor.

### F3'te görülen denge notları

- **Kart temposu:** 15 parçada %10 eşiği çok sık kart veriyor (~1,5 parçada bir). Parça sayısı artınca (24-30) doğal olarak yerine oturur; 15 parçada oynanacaksa eşik %15-20 yapılmalı.
- **Geç oyun ölü büyüleri:** tüm parçalar ~42 sn'de geldiği için Çifte Teslimat ve Hırsız o andan sonra hiçbir şey yapmıyor. Parça sayısı artarsa ya da damlama yavaşlarsa sorun kalmaz; alternatif olarak bu büyüler geç oyunda başka bir etkiye dönüşebilir.

### Bot temposu — dikkat

Parça aralığı × parça sayısı, turun **teorik alt sınırını** belirler (3 sn × 15 parça ≈ 39 sn). Bot düşünme süresi bu aralığın altına inerse bot parçayı gelir gelmez yerleştirir ve insanın onu geçmesi matematiksel olarak imkânsız hale gelir. Bu yüzden bot düşünme süreleri damlama aralığının biraz üstünde tutuluyor (2,4 sn / 3,2 sn / 4,2 sn). Damlama aralığını değiştirirsen bot sürelerini de birlikte ayarla.

## Mimari

Altın kural: simülasyon ile çizim tamamen ayrı.

- Vanilla JS + Canvas 2D. 4 canvas CSS grid'de; büyü kartları, sayaçlar, duyurular HTML/CSS katmanında.
- Sabit adımlı simülasyon (60 Hz), render bağımsız. Seyirci panelleri 15-20 fps.
- **EventBus:** `parça:birleşti`, `büyü:atıldı`, `efekt:bitti`... Büyüler olaylara abone; yeni büyü = tek tanım nesnesi `{id, tür, süre, onApply, onExpire}`.
- **Modifier stack:** efektler değerleri doğrudan bozmaz, çarpan yığınına eklenir (`sürüklemeHızı = taban × aktifÇarpanlar`). Üst üste binme ve süre sonu temizliği bedava.
- **Niyet (intent) soyutlaması:** insan da bot da aynı komutları üretir (`tut`, `taşı`, `bırak`, `büyüAt`). Botlar bedavaya gelir; ileride netcode bu niyetleri ağa yazmakla açılır.
- **PuzzleFactory:** resmi offscreen canvas'ta kare dilimler. Kümeleşme mantığı: birleşen parçalar tek "küme" (cluster) olarak taşınır; snap komşuluk ilişkisine göre çalışır, doğruluk kontrolü kümenin iç tutarlılığından bağımsızdır.
- Seeded RNG her yerde (parça sırası, saçılma konumları, bot kararları).
- Tüm denge sayıları (damlama aralığı, eşikler, büyü süreleri) tek `config` dosyasında.

Klasörler: `core/` (döngü, rng, eventbus, config) · `puzzle/` (dilimleme, küme, snap) · `players/` (durum, girdi, botlar) · `skills/` · `render/` · `ui/`

## Yol haritası

Her faz sonunda tarayıcıda test edilebilir bir sürüm çıkar. Kurulum yok: `index.html` çift tıkla, aç, oyna. Denge sayıları tek config dosyasında — kod bilmeden ayarlanabilir.

| Faz | Ne yapılır | Sen ne test edersin |
|---|---|---|
| **F1a** ✅ | Resmi kare dilimleme, parçaları masaya saçma, mouse ile sürükleme | **His**: sürükleme akıcı mı, parça boyutu iyi mi. En kritik test — gerisi bunun üstüne kuruluyor. |
| **F1b** ✅ | 10 sn'de bir parça gelişi, küme birleştirme, sağ tıkla koparma, süre ve tamamlanma tespiti | Tam bir tek kişilik oyun turu: yapbozu baştan sona bitirebiliyorsun |
| **F2** ✅ | 4 panel düzeni, seyirci görünümleri, 3 bot, yarış ve sıralama | **Yarış hissi**: botların ilerlemesini izlemek gerilim yaratıyor mu, zorluk dengeli mi |
| **F3** ✅ | Büyü sistemi + ilk 6 büyü (Çifte Teslimat, Kontrol, Sis, Rüzgar, Karartma, Hırsız) | Oyunun ruhu: kart seçimi, sabotaj, yetişme mekaniği |
| **F4** ✅ | Izgarayı bozan büyüler + juice (sarsıntı, partikül, parlama, duyurular) | Keyif alıyor muyum |

Oyun F3 sonunda "tarif edilen oyun" haline gelir; F1b ve F2 ara testler için oynanabilir.

## Çok oyunculu (F5-F6)

Tek kişilik yapı olduğu gibi korunur; multiplayer ayrı bir yoldur ve **ancak tıklanınca** devreye girer. Bağlantı kütüphanesi tembel yüklenir, yani tek kişilik oyun internetten tamamen bağımsız kalır.

**Neden bu oyun ağ için kolay:** dört tahta birbirinden bağımsız. Kimse aynı parçaya dokunmaz; etkileşim sadece büyüler, ilerleme çubukları ve birbirini izlemek üzerinden olur. Bu yüzden lockstep determinizm, rollback ya da çakışma çözümü gerekmez — herkes kendi tahtasının sahibi olur, küçük durum özetleri yayınlar. Hile önemsenmediği için doğrulama katmanı da yoktur.

**Topoloji:** yıldız. Herkes oda sahibine bağlanır, oda sahibi mesajları dağıtır. Tam ağ (herkes herkese) düzeninden çok daha az şey ters gider.

**Koltuk ≠ panel.** Koltuk numarası ağda kimliktir; panel numarası ekranda nereye çizildiğidir. Her istemcide kendi koltuğu panel 0'a (büyük panel) eşlenir. Böylece her oyuncu kendini büyük panelde görür ve ekran düzenine hiç dokunmak gerekmez.

| Faz | Kapsam |
|---|---|
| **F5** ✅ | Oda kur/katıl, lobi, koltuk dağıtımı, boş koltuklara bot, ortak seed ile senkron başlangıç, canlı ilerleme çubukları |
| **F6** | Tahta özetleri (rakiplerin parçalarını görmek), büyülerin ağ üzerinden iletimi, tur bitişinde ortak sonuç, kopan bağlantının bota dönüşmesi |

Basit tutmak için verilen kararlar: tahta durumu fark hesabı yapılmadan olduğu gibi gönderilir (15 parça zaten küçüktür), büyünün hedefini atan seçip açıkça bildirir (gecikme yüzünden kimse farklı lider görmesin), yeniden bağlanma ve merkez değişimi yoktur.

## Açık konular

- Resim kaynağı: hazır resim seti mi, oyuncu kendi resmini mi yükler? (MVP: hazır set)
- Parça sayısı / zorluk kademeleri (MVP: 6×5 = 30 parça civarı)
- Süreli mod ve döndürmeli "zor mod" — sonraya
