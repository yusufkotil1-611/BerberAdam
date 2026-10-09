# BERBERADAM — Berber / Erkek Kuaförü Web Sitesi & Yönetim Paneli

Erenler/Sakarya'daki **BERBERADAM** için hazırlanmış; koyu temalı, animasyonlu, ses efektli, gerçek veri tabanlı randevu sistemi ve admin paneli olan tam kapsamlı web uygulaması.

**Teknoloji:** Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS 4 · Framer Motion · Lucide · SQLite / Turso (libSQL) · bcrypt + JWT · Web Audio API · Zod

---

## Hızlı başlangıç

Gereksinim: **Node.js 22.13 veya üstü**.

```bash
npm install
npm run dev
```

- Site: <http://localhost:3000>
- Yönetim paneli: <http://localhost:3000/admin> — varsayılan şifre **`000000`**
- Giriş yaptıktan sonra **Ayarlar → Şifre Değiştir** ile şifrenizi mutlaka değiştirin (panel bunu hatırlatır).

Ekstra kurulum gerekmez: yerelde veri tabanı (`data/berberadam.db`, Node'un yerleşik `node:sqlite` modülüyle), tablolar, örnek hizmetler/personel ve admin şifresinin hash'i ilk çalıştırmada otomatik oluşturulur; yerel/native bağımlılık yoktur. JWT anahtarı da otomatik üretilip veri tabanında saklanır.

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi / sunucusu |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run reset-db` | Veri tabanını siler, sıfırdan kurar (önce sunucuyu durdurun) |
| `npm run backup` | Yedek alır: yerelde SQLite kopyası, Turso'da JSON (`backups/`, son 14 saklanır). Panelden de indirilebilir. |

### Demo verisi
Panel boşken nasıl göründüğünü görmek için **Admin → Ayarlar → Örnek Veri Yükle** ile 14 örnek müşteri ve son 4 hafta + önümüzdeki hafta için yaklaşık 300 örnek randevu ekleyebilirsiniz. Sitenin ilk açılışta gösterdiği 4 örnek yorum da "demo" olarak işaretlidir. **Canlıya almadan önce "Demo Verilerini Temizle"ye basın**; gerçek kayıtlarınıza dokunmaz.

### Canlıya alma (ücretsiz, sunucusuz)
Müşteri sitesi ve yönetim paneli **iki ayrı adreste** yayınlanır (`ADMIN_HOST` ortam değişkeni). Netlify (barındırma) + Turso (bulut SQLite) ile adım adım kılavuz: **[DEPLOY.md](DEPLOY.md)**. Berbere göstermek için **demo** olarak Vercel Hobby + Turso: **[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)** (ticari yayın için Netlify ya da Vercel Pro'ya geçilmelidir). Kendi sunucunuzda çalıştırmak isterseniz: [deploy/VPS-ORACLE.md](deploy/VPS-ORACLE.md). Ortam değişkenleri: [.env.example](.env.example).

---

## Özellikler

### Müşteri yüzü
- Lüks koyu tema (asfalt grisi, altın/amber, neon vurgular), cam efektli (glassmorphism) kartlar
- Framer Motion: scroll ile beliren öğeler (`whileInView`), parlayan/büyüyen butonlar, fareyi izleyen kart ışığı, parallax hero, kaydırma ilerleme çubuğu
- Arka planda süzülen makas / tarak / ustura / tıraş makinesi desenleri ve **özel imleç** (yalnızca fare olan cihazlarda)
- **Ses efektleri** (Web Audio ile sentezlenir, dosya gerekmez; menüdeki hoparlör düğmesiyle kapatılır, tercih hatırlanır): tık sesi, hizmet seçerken makas "şıkırtısı", adım geçişlerinde tıraş makinesi "vınnn", randevu onayında arpej + uzun tutulan başarı melodisi, hata sesi
- **Hizmet kartları:** süre + fiyat belirgin; "Randevu Al" seçilen hizmetle hazır açılır
- **5 adımlı randevu:** Hizmet (çoklu seçim) → Berber ("Fark Etmez" dahil) → Tarih & Saat (veri tabanından doluluk; dolu saatler kırmızı/pasif) → Bilgiler → Onay + **SMS/WhatsApp bildirim simülasyonu** (telefon mockup'ı, WhatsApp'a gönder, takvime ekle `.ics`)
- Telefon `tel:` bağlantısı, WhatsApp randevu/destek hattı, canlı Google Maps + "Yol Tarifi Al", canlı "şu an açık/kapalı" göstergesi
- **Önce/Sonra** sürgülü karşılaştırma (dokunmatik, fare ve klavye ile), **yorum + yıldız puanlama** (canlı kayıt), **sadakat programı** ("5 tıraşa 1 cilt bakımı hediye" — telefon numarasıyla gerçek damga sorgusu)
- Mobil öncelikli, tüm cihazlara uyumlu; SEO için `schema.org/BarberShop` yapılandırılmış verisi

### Admin paneli (`/admin`)
- Şifreli giriş (bcrypt + httpOnly JWT oturum çerezi), panel içinden **şifre değiştirme** (eski/yeni doğrulama)
- **Genel Bakış:** bugünkü randevu, bekleyen onay, toplam müşteri, haftalık/aylık tahmini ve gerçekleşen gelir (grafikli), popüler hizmetler, yaklaşan randevular, bildirim günlüğü
- **Randevular:** günlük / haftalık / liste görünümü; Bekleyen · Onaylanan · Tamamlanan · İptal filtreleri; arama; tek tıkla **Onayla / Tamamlandı / İptal Et**; müşteriyi arama ve WhatsApp'tan yazma
- **Müşteriler:** kim kaç kez gelmiş, telefon, toplam harcama, son ziyaret, randevu geçmişi, özel notlar, KVKK silme
- **Hizmet & Fiyat:** ekle / düzenle / sil / sitede gizle
- **Personel:** ekle / düzenle / pasif yap
- **Saatler & Doluluk:** haftalık çalışma saatleri, randevu aralığı (10–60 dk), en erken randevu süresi, kaç gün ilerisine randevu; **tatil / özel kapalı gün** (tüm gün veya saat aralığı; tüm dükkan veya tek personel)
- **Yorumlar:** gizle / yayınla / sil

---

## Randevu mantığı

- Hizmet süreleri toplanır; başlangıç saatleri `slotStep` aralığıyla üretilir (varsayılan 30 dk).
- Bir saat; o berberde çakışan randevu (iptaller hariç) ya da kapalı gün/saat aralığı yoksa, çalışma saatine sığıyorsa ve geçmişte kalmıyorsa **müsait** sayılır. "Fark etmez"de en az bir berber müsaitse saat boştur.
- Fiyat, süre, doluluk **her zaman sunucuda yeniden hesaplanır**; istemciden gelen değerlere güvenilmez. Kayıt, "bu berberde çakışan randevu yoksa ekle" koşuluyla **tek atomik işlemde** yapılır; sunucusuz ortamda aynı anda gelen iki istek bile aynı saati alamaz (çakışmada `409`). 10 eşzamanlı istekle denendi: yalnızca 1'i kabul edildi.
- "Fark etmez" seçildiğinde o gün en az randevusu olan müsait berber atanır.
- Aynı telefonla en fazla 3 aktif (bekleyen/onaylı, ileri tarihli) randevu alınabilir.
- Saat dilimi sabit: `Europe/Istanbul`.

---

## Güvenlik

- Admin şifresi **bcrypt (12 tur)** ile hashlenip veri tabanında saklanır; düz metin hiçbir yerde tutulmaz.
- Oturum: `HS256` imzalı JWT, `httpOnly` + `SameSite=Strict` (+ `Secure` üretimde) çerez, 8 saat ömür. Şifre değişince `token_version` artar ve **tüm eski oturumlar geçersiz olur**.
- Tüm `/api/admin/*` rotaları sunucuda yetki kontrolü yapar; yazma isteklerinde ek **Origin kontrolü** (CSRF) vardır.
- Giriş denemeleri sınırlıdır: IP başına 15 dk'da 5 hatalı deneme, tüm IP'ler için saatte 100 (6 haneli PIN'e karşı kaba kuvvet koruması). Randevu, yorum ve sorgu uçlarında da hız sınırı vardır. Sayaçlar **veri tabanında** tutulur; bu yüzden sunucusuz ortamda ve sunucu yeniden başlasa da geçerlidir.
- Tüm girdiler **Zod** ile doğrulanır; SQL sorguları parametriktir; React çıktıyı kaçışlar (XSS).
- Güvenlik başlıkları (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) `next.config.mjs` içinde tanımlıdır.

**Üretime alırken:**
1. Varsayılan şifreyi değiştirin (6 hane PIN zayıftır; mümkünse daha uzun bir şifre seçin).
2. Siteyi **HTTPS** arkasında yayınlayın (Netlify bunu kendiliğinden yapar). Kendi sunucunuzda bir ters vekil (Nginx, Caddy…) kullanıyorsanız `X-Forwarded-For` başlığını ilettiğinden emin olun; hız sınırlayıcı istemci IP'sini oradan okur.
3. Yönetimi ayrı alan adına almak için `ADMIN_HOST`, ilk şifre için `ADMIN_INITIAL_PASSWORD` kullanın; isteğe bağlı olarak `JWT_SECRET` verin (bkz. `.env.example`, `DEPLOY.md`).
4. Verilerinizi düzenli yedekleyin: Admin → Ayarlar → **Yedeği İndir** (ya da `npm run backup`).

> **Veri tabanı:** `TURSO_DATABASE_URL` tanımlıysa uygulama Turso (bulut SQLite) kullanır; bu, Netlify gibi dosya sistemi kalıcı olmayan sunucusuz ortamlar için gereklidir. Tanımlı değilse yerel SQLite dosyası (`data/berberadam.db`) kullanılır. İki sürücü aynı arayüzü paylaşır (`src/lib/db.ts`), bu yüzden diğer kodun hangisinin çalıştığından haberi yoktur. Netlify'da `TURSO_DATABASE_URL` yoksa uygulama sessizce geçici dosya yazmak yerine açık bir hata verir.

---

## Proje yapısı

```
src/
├─ app/
│  ├─ layout.tsx · globals.css       Kök yerleşim, yazı tipleri, tasarım sistemi (@theme)
│  ├─ page.tsx                       Ana sayfa (sunucuda veri tabanından okur)
│  ├─ admin/page.tsx                 Yönetim paneli girişi
│  └─ api/
│     ├─ health · availability · appointments · reviews · loyalty   Herkese açık uçlar
│     └─ admin/ login · logout · me · password · stats · appointments · customers ·
│               services · staff · hours · closures · reviews · demo · export   (yetki gerekir)
├─ components/
│  ├─ site/        Navbar, Hero, Services(+Team,Marquee), Gallery(+Portrait), Loyalty, Reviews, Contact, Footer
│  ├─ booking/     BookingProvider, BookingModal (5 adımlı randevu)
│  ├─ admin/       AdminApp, Login, Overview, Appointments, Customers, Catalog, Hours, Reviews, Settings
│  └─ CustomCursor · FloatingTools · SoundProvider · ServiceIcon · ui
└─ lib/
   ├─ db.ts          İki sürücü (Turso / yerel SQLite), şema, ilk veri (seed)
   ├─ booking.ts     Doluluk hesabı, atomik randevu oluşturma, durum güncelleme
   ├─ host.ts        Alan adına göre erişim (ADMIN_HOST)
   ├─ queries.ts · stats.ts · demo.ts
   ├─ auth.ts        bcrypt + JWT oturum, guardAdmin (yetki + CSRF)
   ├─ schemas.ts     Zod doğrulama şemaları
   ├─ rate-limit.ts (veri tabanı destekli) · http.ts · time.ts · open-status.ts
   ├─ sound.ts       Web Audio ses sentezi
   └─ site.ts        Marka/iletişim sabitleri
scripts/             reset-db.mjs · backup-db.mjs
deploy/              Kendi sunucunuz için: Caddyfile, systemd servisi, DuckDNS betiği, VPS-ORACLE.md
netlify.toml         Netlify yapılandırması
data/                (yalnızca yerel modda; otomatik oluşur, git'e eklenmez)
```

---

## Özelleştirme

| Ne | Nerede |
|---|---|
| Telefon, adres, WhatsApp, harita, marka metni | `src/lib/site.ts` |
| Renkler, yazı tipleri, animasyon süreleri | `src/app/globals.css` (`@theme` bloğu), yazı tipleri `src/app/layout.tsx` |
| Hizmetler, fiyatlar, personel, saatler | Admin paneli (ilk örnek değerler `src/lib/db.ts` → `seed`) |
| Önce/Sonra fotoğrafları | Görselleri `public/gallery/` içine koyup `src/components/site/Gallery.tsx` içindeki `GALLERY` kayıtlarına `beforeSrc` / `afterSrc` yazın. Verilmezse stilize çizim gösterilir. |
| Sadakat hedefi (5 tıraş) | `LOYALTY_TARGET` → `src/lib/site.ts` |
| Ses efektleri | `src/lib/sound.ts` |

### Gerçek SMS / WhatsApp bildirimi
Şu an bildirimler **simülasyondur**: mesajlar `notifications` tablosuna yazılır, müşteriye telefon mockup'ında gösterilir ve admin panelinde listelenir. Gerçek gönderim için `src/lib/booking.ts` içinde `INSERT INTO notifications` yapılan iki yerde (randevu oluşturma ve durum güncelleme) bir SMS sağlayıcısı (ör. Netgsm, İleti Merkezi) ya da WhatsApp Business API çağrısı ekleyin.

---

## Notlar

- Siteyle gelen **fiyatlar, personel isimleri, örnek yorumlar ve galeri çizimleri yer tutucudur**; gerçek bilgilerle değiştirin.
- Yazı tipleri (Inter, Oswald, Playfair Display) Google Fonts'tan yüklenir; çevrimdışıyken sistem yazı tiplerine düşer.
- Google Maps gömmesi API anahtarı gerektirmez.
