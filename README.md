# Puzzle Party

Dört kişilik rekabetçi yapboz oyunu. Herkes aynı yapbozu aynı anda dizer, ilk bitiren kazanır — ve rakiplerinize büyü atarak işlerini bozabilirsiniz.

**▶ Oyna: https://tahadervisoglu.github.io/puzzle-game/**

Tarayıcıda çalışır, kurulum gerektirmez.

## Ne bu?

Tricky Towers'ın büyü gerilimini yapboza taşıyan bir prototip. Ekran dört panele bölünür: soldaki büyük panel sizin, diğer üçü rakiplerinizin canlı görünümü. Kimin ne kadar ilerlediğini, kimin tahtasının dağıldığını anlık olarak görürsünüz.

Yapbozun referans resmi ortada, herkesin ortak kullanımında durur. Parçalar kare kesilmiştir; ızgaraya oturur, ızgara dışında birbirine yapıştırılabilir.

## Nasıl oynanır

- **Sol tık** parçayı sürükler. Izgara hücresine yakın bırakınca oturur.
- Oyun **doğru mu yanlış mı söylemez**. Sadece kaç parçanızın doğru olduğunu görürsünüz, hangilerinin yanlış olduğunu değil.
- Dolu bir hücreye bırakırsanız iki parça **yer değiştirir**.
- Izgara dışında parçalar birbirine **yapışır** ve küme olarak birlikte taşınır. **Sağ tık** kümeden tek parça koparır.
- Arada bir kenardan **bir el uzanır** ve ızgaraya yerleştirdiğiniz bir parçayı sökmeye çalışır. Üstüne tıklarsanız tokadı yiyip geri çekilir; yetişemezseniz parçayı alıp masaya fırlatır. Yapbozla uğraşırken bir gözünüz hep onda olmak zorunda.

Her yeni oyunda **başka bir manzara** çıkar; resim o turun tohumundan üretilir, çok oyunculuda ise herkes aynısını görür.

Üç mod var, oyun başında seçilir:

- **Klasik** — dört kişi, herkese kendi parçaları düşer, birkaç saniyede bir yenisi gelir.
- **Teke tek** — iki kişi, iki büyük panel. Her saldırı doğrudan karşınızdakine gider, saklanacak kalabalık yoktur.
- **Ortak havuz** — dört kişi, parçalar alttaki ortak havuza düşer ve hepiniz oradan kaparsınız. İhtiyacınız olanı rakipten önce almalısınız.

## Büyüler

İlerledikçe önünüze **iki kart** çıkar: biri size fayda sağlar, biri rakibe zarar verir. Birini seçersiniz, anında çalışır.

Referansı herkesten gizleyen sis, tahtaları sarsıp parça söken deprem, masayı süpüren rüzgar, rakibin ekranını karartan büyüler, parça çalanlar, iki parçanın yerini sessizce değiştirip kimseye söylemeyenler…

Saldırılar hedefin ekranında **bir saniye önceden uyarı verir** — yani gördüğünüz felakete hazırlanacak kadar vaktiniz olur, engelleyecek kadar değil.

## Kumar destesi

Büyülerden ayrı ikinci bir katman. Belirli aralıklarla elinize **kör bir kart** gelir; ne geleceğini seçemezsiniz. Kartlar elinizde birikir, istediğiniz an oynarsınız.

Rakipler **kaç kartınız olduğunu görür, hangileri olduğunu göremez.**

Deste oyuncu sayısına göre değişir; bazı kartlar teke tekte anlamını yitirdiği için o modda hiç dağıtılmaz.

Destede tahtanızı rastgele bir rakiple takas eden, yazı tura atıp parçalarınızı ya söken ya da yerine oturtan, herkesi birden vuran ve kendinizi de yakabileceğiniz kartlar var.

## Arkadaşlarla oynama

Başlangıç ekranından **oda kurun**, çıkan kısa kodu arkadaşlarınıza gönderin, onlar da o kodla katılsın. Boş koltukları bot doldurur, yani iki kişiyle de oynanır. Herkes kendini büyük panelde, diğerlerini küçük panellerde görür.

Modu **oda sahibi lobiden seçer** ve seçim herkese uygulanır. Teke tek seçildiğinde oda iki kişilik olur; iki kişiden fazlası bağlıyken bu mod seçilemez.

Bağlantı tarayıcıdan tarayıcıya kurulur. Sorun yaşarsanız başlangıç ekranındaki **bağlantı testi** düğmesi nerede takıldığını söyler.

## Çalıştırma

Derleme, paket yöneticisi, sunucu yok. Depoyu indirip `index.html` dosyasına çift tıklamanız yeterli. (Arkadaşlarla oynamak için sayfanın bir https adresinden açılması gerekir.)

Zorluk ve denge ayarlarının tamamı [src/core/config.js](src/core/config.js) içinde tek yerde toplanmıştır: parça sayısı, parça geliş hızı, yapışma toleransı, bot zorluğu, büyü sıklığı. Kod bilmeden değiştirip oynayabilirsiniz.

## Yapı

Bağımlılığı olmayan düz JavaScript ve Canvas.

```
src/
  core/     oyun döngüsü, seeded rng, olay veri yolu, ayarlar
  puzzle/   resim üretimi, dilimleme, ızgara, kümeler, ortak havuz
  players/  oyuncu birimi, girdi, insan ve bot denetleyicileri
  skills/   büyüler ve kumar destesi
  render/   canvas çizimi, efektler, prosedürel ses
  net/      çok oyunculu bağlantı ve lobi
  ui/       stil ve ayar paneli
```

Birkaç tasarım tercihi:

- Simülasyon ile çizim tamamen ayrı; simülasyon sabit adımda ilerler.
- İnsan ve bot **aynı oyuncu birimini** kullanır, aradaki tek fark onu süren denetleyicidir. Ağ oyuncusu da üçüncü bir denetleyici olarak eklenmiştir.
- Büyüler ne görüneceğini ve nasıl duyulacağını bilmez; görsel ve ses eşlemeleri ayrı katmandadır. Yeni bir büyü eklemek tek bir nesne yazmaktır.
- Tüm sesler kodda üretilir, indirilen ses dosyası yoktur.
- Yapbozun resmi de kodda çizilir; projede hiçbir görsel dosya yoktur.

Ayrıntılı tasarım notları ve oynanış kararlarının gerekçeleri [DESIGN.md](DESIGN.md) içinde.

## Durum

Oynanabilir prototip. Tek kişilik oyun botlara karşı tamamen çalışır; çok oyunculu kısım oda kurma, senkron başlangıç, canlı tahta paylaşımı ve büyülerin karşıya geçmesini kapsar.

Bundan sonrası için düşünülenler: parça sayısını artırmak, gerçek bir görsel seti, oyun içi ses ayarları ve aynı bilgisayarda dört kişilik kumanda desteği.
