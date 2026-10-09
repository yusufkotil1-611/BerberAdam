# Canlıya Alma Kılavuzu — Netlify + Turso (tamamen ücretsiz, sunucusuz)

Sonunda iki ayrı adresiniz olacak:

| Adres (örnek) | Ne gösterir |
|---|---|
| `https://berberadam.netlify.app` | Müşteri sitesi + online randevu. `/admin` burada **hiç yoktur** (404). |
| `https://berberadam-yonetim.netlify.app` | Yalnızca yönetim paneli. |

**Parçalar:** Netlify (siteyi çalıştırır, ücretsiz adres verir) · Turso (verilerin tutulduğu ücretsiz bulut veri tabanı) · GitHub (kodu Netlify'a taşır).
Sunucu kurmak, port açmak, kredi kartı vermek gerekmez.

> Hesapları (GitHub, Turso, Netlify) sizin açmanız gerekir; kimlik bilgisi istedikleri için bunları sizin yerinize ben yapamam. Uygulama tarafını yerelde test ettim; **Netlify ve Turso üzerinde gerçek bir deneme yapmadım**. Bu yüzden en sonda bir kontrol listesi ve sorun giderme tablosu var. Takıldığınız yerin ekran görüntüsünü ya da hata metnini bana gönderin.

---

## 1. Turso'da veri tabanı oluşturun (5 dk)

1. <https://turso.tech> → **Sign up** (GitHub veya Google ile; kart istemez).
2. **Create database** → ad: `berberadam` → bölge olarak **Avrupa'daki** bir bölgeyi seçin (Türkiye'ye en yakını) → oluşturun.
3. Veri tabanının sayfasından iki bilgiyi kopyalayıp bir yere yazın:
   - **URL** — `libsql://berberadam-....turso.io` biçiminde
   - **Token** — "Create token" / "Generate token" ile üretilir (okuma-yazma yetkili olsun)

Tabloları siz oluşturmayacaksınız; uygulama ilk açılışta kendisi kurar.

## 2. Kodu GitHub'a yükleyin

1. <https://github.com> hesabınız yoksa açın. **New repository** → ad: `berberadam` → **Private** → oluşturun (boş bırakın, README eklemeyin).
2. Bilgisayarınıza Git kurun (PowerShell): `winget install --id Git.Git -e` — sonra PowerShell'i kapatıp yeniden açın.
3. Proje klasöründe (GitHub'daki sayfada yazan adresi kullanın):

```powershell
cd C:\Users\messi\Desktop\BERBERADAM
git init
git add .
git commit -m "BERBERADAM"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/berberadam.git
git push -u origin main
```

İlk `git push`ta tarayıcı açılıp GitHub girişi ister; izin verin. `.gitignore` sayesinde veri tabanı ve gizli dosyalar yüklenmez.

## 3. Netlify'da iki site oluşturun

<https://app.netlify.com> → **Sign up** (GitHub ile giriş en kolayı; kart istemez).

Aşağıdaki adımları **iki kez** yapacaksınız: bir kez müşteri sitesi, bir kez yönetim paneli için. İkisi **aynı depoyu** kullanır, aynı ayarları taşır; tek fark site adı.

1. **Add new site → Import an existing project → GitHub** → `berberadam` deposunu seçin.
2. **Site name** alanına benzersiz bir ad yazın:
   - müşteri sitesi için: `berberadam` (alınmışsa `berberadam-erenler` gibi başka bir ad)
   - yönetim paneli için: `berberadam-yonetim` (alınmışsa `berberadam-erenler-yonetim` gibi)
3. Build ayarlarına dokunmayın (otomatik algılanır). **Environment variables** bölümünü açıp aşağıdaki değişkenleri **iki sitede de aynı değerlerle** ekleyin. (Dosya olarak içeri aktarma seçeneği varsa, değerleri bir `.env` dosyasına yazıp onu da yükleyebilirsiniz.)

| Değişken | Değer |
|---|---|
| `TURSO_DATABASE_URL` | 1. adımdaki `libsql://...` adresi |
| `TURSO_AUTH_TOKEN` | 1. adımdaki token |
| `ADMIN_HOST` | **yönetim sitesinin** adresi, `https://` olmadan: `berberadam-yonetim.netlify.app` |
| `PUBLIC_URL` | **müşteri sitesinin** tam adresi: `https://berberadam.netlify.app` |
| `ADMIN_INITIAL_PASSWORD` | Panel için **kendi seçeceğiniz güçlü şifre** (en az 6 karakter) |

4. **Deploy** deyin. İlk derleme birkaç dakika sürer.

> **Neden iki siteye de aynı ayarlar?** Uygulama, gelen isteğin alan adına bakar: `ADMIN_HOST` ile eşleşen adreste yalnızca yönetim paneli çalışır, diğer her adreste yalnızca müşteri sitesi çalışır. İki site de aynı koddur; hangisinin ne olacağını adresi belirler.
>
> **`ADMIN_INITIAL_PASSWORD` ne işe yarar?** Panel, internete açıldığı ilk saniyeden itibaren herkesin bildiği `000000` yerine sizin şifrenizle başlar. Yalnızca veri tabanı ilk oluşurken okunur. Sonradan **Ayarlar → Şifre Değiştir** ile değiştirebilirsiniz.

> **Tek site yeterli mi?** İsterseniz yalnızca **bir** Netlify sitesi kurup `ADMIN_HOST` değişkenini **hiç eklemeyebilirsiniz**. O zaman yönetim paneli aynı adreste `/admin` olarak çalışır ve sitedeki menüde (üç çizgi) **Admin Paneli** girişi görünür. Daha az kurulum demektir; tek farkı, giriş sayfasının müşteri adresinde de bulunmasıdır (yine şifre ve deneme sınırıyla korunur). İki site kurarsanız, menüdeki **Admin Paneli** bağlantısı yönetim sitesinin adresine gider.

## 4. Kontrol listesi

Her iki site de "Published" olunca:

- [ ] `https://berberadam.netlify.app/api/health` → `{"ok":true,"database":"turso","services":6}` görmelisiniz (**veri tabanı bağlantısı çalışıyor demektir**)
- [ ] `https://berberadam.netlify.app` → site açılıyor
- [ ] `https://berberadam.netlify.app/admin` → **404** (olması gereken bu)
- [ ] `https://berberadam-yonetim.netlify.app` → yönetim girişine yönleniyor
- [ ] `ADMIN_INITIAL_PASSWORD`'deki şifreyle giriş yapabiliyorsunuz; `000000` **reddediliyor**
- [ ] Siteden deneme randevusu alıp panelde görüyorsunuz
- [ ] Panelde **Ayarlar → Demo Verilerini Temizle** ile yer tutucu yorumları kaldırdınız ve gerçek bilgileri girdiniz (fiyatlar, personel, saatler)

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| `/api/health` 503 veriyor | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` yanlış ya da eksik. Netlify → Site configuration → Environment variables; düzeltince **Deploys → Trigger deploy → Clear cache and deploy site**. |
| Yönetim adresinde 404 | `ADMIN_HOST` değeri, tarayıcıdaki adresle birebir aynı mı? (`https://` ve sondaki `/` olmadan.) Değiştirdiyseniz yeniden deploy edin. |
| Müşteri sitesinde de `/admin` açılıyor | `ADMIN_HOST` boş kalmış. |
| Derleme "secrets scanning" hatası veriyor | Hata mesajındaki değişken adını Netlify'da `SECRETS_SCAN_OMIT_KEYS` listesine ekleyin (`netlify.toml`'da bazıları zaten ekli). |
| Derleme başka bir hatayla duruyor | Netlify → Deploys → başarısız derleme → log'un son 30 satırını bana gönderin. |
| İlk açılış 2–3 sn yavaş | Sunucusuz yapıda uzun süre kullanılmayan site "soğuk başlar"; sonraki istekler hızlıdır. |
| Giriş "çok fazla hatalı deneme" | IP başına 15 dk bekleyin (sayaç veri tabanında tutulur; yeniden deploy etmek sıfırlamaz). |
| Sayfalar yavaş, veri geç geliyor | Netlify → Site configuration → Functions bölümünde bölge seçeneği varsa fonksiyon bölgesini Turso'yu seçtiğiniz Avrupa bölgesine yakın yapın. |

---

## Güncelleme (kodu değiştirdiğinizde)

```powershell
cd C:\Users\messi\Desktop\BERBERADAM
git add .
git commit -m "Güncelleme"
git push
```

Netlify, push'u görünce **iki siteyi de** otomatik yeniden yayınlar. Veriler Turso'da olduğu için güncellemeden etkilenmez.

## Yedekleme

Verileriniz Turso'da durur. Ek olarak:

- **Panelden:** Ayarlar → **Yedeği İndir (JSON)**. Haftada bir indirip saklamanızı öneririz.
- **Komutla** (isteğe bağlı): `TURSO_DATABASE_URL` ve `TURSO_AUTH_TOKEN` ortam değişkenleri tanımlıyken `npm run backup`.

## Sınırlar ve maliyet

- Netlify ve Turso'nun ücretsiz planlarının aylık kullanım limitleri vardır. Bir berber sitesinin trafiği bunların çok altında kalır; yine de kullanımı zaman zaman Netlify'ın **Billing / Usage** sayfasından kontrol edin. (Güncel limitler değişebilir; bu kılavuzu yazarken Turso ücretsiz planının 100 veri tabanı, 5 GB depolama ve ayda 500 milyon satır okuma içerdiğini doğruladım.)
- Ücretsiz planlar ticari kullanıma uygundur: [Netlify](https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545/2) bunu açıkça belirtiyor.
- `netlify.app` adresleri Netlify'ındır; alan adı sizin değildir. Kalıcı bir marka adresi için ileride yıllık birkaç dolarlık bir alan adı alıp Netlify'da **Domain management** bölümünden iki siteye bağlayabilirsiniz. Sonra `ADMIN_HOST` ve `PUBLIC_URL`'yi yeni adreslerle güncelleyip yeniden deploy etmeniz yeterlidir; kod değişikliği gerekmez.

## Güvenlik özeti

- Yönetim girişi müşteri sitesinde yoktur (404); oturum çerezi yalnızca yönetim adresine aittir (`httpOnly`, `Secure`, `SameSite=Strict`).
- Giriş denemeleri sınırlıdır (IP başına 15 dk'da 5; toplamda saatte 100). Sayaçlar veri tabanında tutulduğu için sunucusuz ortamda da güvenilir çalışır.
- Çift rezervasyon veri tabanı seviyesinde engellenir: aynı saate aynı anda gelen iki istekten yalnızca biri kabul edilir.
- Yine de **güçlü bir şifre** seçin: 6 haneli rakam şifre internete açık bir panel için zayıftır.

## Alternatif: kendi sunucunuz

Uygulama kendi sunucunuzda (VPS) yerel SQLite dosyasıyla da çalışır: [deploy/VPS-ORACLE.md](deploy/VPS-ORACLE.md).
