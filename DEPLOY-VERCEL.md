# Vercel (ücretsiz Hobby) + Turso ile Demo Yayını

Amaç: siteyi berbere göstermek için `https://berberadam.vercel.app` gibi **ücretsiz** bir adreste yayınlamak. Veriler Turso'da (ücretsiz bulut veri tabanı) durur.

> ### Önce şunu bilin
> Vercel'in ücretsiz **Hobby** planı [yalnızca kişisel / ticari olmayan kullanım](https://vercel.com/docs/limits/fair-use-guidelines) içindir. Bu yayını **sadece demo** olarak kullanın:
> - Gerçek müşterilerin randevu almasına açmayın (adresi yalnızca berbere/tanıdıklara gösterin).
> - Berber "evet" derse, dükkan gerçek randevu almaya başlamadan önce **ticari yayına geçin** (aşağıda "Ticariye geçiş").
>
> Müşteri için hazırlanan iş, Vercel'in tanımında "ticari" sayılabilir; bu gri bir alandır. Hesabın kapanma riski sizde kalır, bu yüzden demoyu kısa tutmanızı ve karar çıkınca taşımanızı öneririm.
>
> Uygulamayı Vercel'de gerçek bir Vercel hesabında denemedim; kodda Vercel'e özel bir engel yok (Next.js'i kendiliğinden tanır). Takıldığınız yerin hata metnini bana gönderin.

---

## 1. Turso'da veri tabanı oluşturun (5 dk)

1. <https://turso.tech> → **Sign up** (GitHub veya Google ile; kart istemez).
2. **Create database** → ad: `berberadam` → bölge: **Avrupa'daki** bir bölge.
3. İki bilgiyi bir yere kopyalayın:
   - **URL** — `libsql://berberadam-....turso.io`
   - **Token** — "Create token" ile üretilir (okuma-yazma yetkili)

Tabloları siz oluşturmayacaksınız; uygulama ilk açılışta kendisi kurar.

## 2. GitHub'daki değişiklikleri `main`'e alın

Vercel, `main` dalını yayınlar. GitHub'da `BerberAdam` deposunda **Pull requests** → açık PR'ı açın → **Merge pull request** → **Confirm merge**. (Bu kılavuzun eklendiği PR budur.)

## 3. Vercel'de projeyi oluşturun

1. <https://vercel.com> → **Sign Up** → **Continue with GitHub** (depoyu oluşturduğunuz `yusufkotil1-611` hesabıyla). Plan olarak **Hobby** seçilir.
2. **Add New… → Project** → **Import Git Repository** bölümünde `BerberAdam`'ı bulun. Görünmüyorsa **Adjust GitHub App Permissions** ile depoya erişim izni verin.
3. **Import**'a basın ve şunları ayarlayın:
   - **Project Name:** `berberadam` (alınmışsa `berberadam-demo` gibi başka bir ad). Adres bu addan çıkar: `https://<ad>.vercel.app`
   - **Framework Preset:** Next.js (kendiliğinden seçilir; build ayarlarına dokunmayın)
   - **Environment Variables** — şunları ekleyin:

| Ad | Değer |
|---|---|
| `TURSO_DATABASE_URL` | 1. adımdaki `libsql://...` adresi |
| `TURSO_AUTH_TOKEN` | 1. adımdaki token |
| `ADMIN_INITIAL_PASSWORD` | Panel için **kendi seçeceğiniz** güçlü şifre (en az 6 karakter) |
| `PUBLIC_URL` | `https://<proje-adı>.vercel.app` (adı yukarıda ne seçtiyseniz) |

   `ADMIN_HOST` değişkenini **eklemeyin**. Tek proje yeterli: panel aynı adreste `/admin` olarak çalışır ve sitedeki üç çizgi menüsünde **Admin Paneli** girişi görünür.
4. **Deploy**. İlk derleme birkaç dakika sürer.

> `ADMIN_INITIAL_PASSWORD`, panelin internete açıldığı ilk andan itibaren `000000` yerine sizin şifrenizle başlamasını sağlar. Yalnızca veri tabanı ilk oluşurken okunur; sonradan **Ayarlar → Şifre Değiştir** ile değiştirebilirsiniz.

`vercel.json` dosyası fonksiyonları **Frankfurt (fra1)** bölgesine sabitler; Turso'yu Avrupa'da seçtiğiniz için sayfalar daha hızlı açılır. (Doğrulamak için: Vercel → proje → Settings → Functions → Function Region.)

## 4. Kontrol listesi

- [ ] `https://<ad>.vercel.app/api/health` → `{"ok":true,"database":"turso","services":6}` (veri tabanı bağlantısı çalışıyor demektir)
- [ ] `https://<ad>.vercel.app` → site açılıyor
- [ ] Üç çizgi menüsü → **Admin Paneli** → şifre ekranı → `ADMIN_INITIAL_PASSWORD`'deki şifreyle giriş
- [ ] Panelde **Ayarlar → Örnek Veri Yükle** ile panelin dolu halini hazırlayın (berbere göstermek için)
- [ ] **Hizmet & Fiyat**, **Personel** ve **Saatler** bölümlerinde berberin gerçek bilgilerini girin (fiyatlar, ustaların adları, çalışma saatleri yer tutucudur)
- [ ] Siteden deneme randevusu alıp panelde görüyorsunuz

## Güncelleme

Kodu değiştirince proje klasöründe `git add .`, `git commit -m "açıklama"`, `git push` yeterli; Vercel kendisi yeniden yayınlar. Veriler Turso'da olduğu için güncellemeden etkilenmez. (Ayrı bir dala push ederseniz Vercel onu "Preview" adresinde yayınlar.)

## Ticariye geçiş (berber "evet" derse)

Veriler Turso'da olduğu için taşıma kolaydır, hiçbir şey kaybolmaz:

1. **Seçenek A — Netlify (ücretsiz, ticari kullanıma açık):** [DEPLOY.md](DEPLOY.md) 3. adımı aynı ortam değişkenleriyle uygulayın (`TURSO_*` aynı kalır; yeni `PUBLIC_URL`'yi girin). Sonra Vercel projesini silin.
2. **Seçenek B — Vercel Pro:** Vercel'de planı Pro'ya yükseltin (ücretli).
3. **Alan adı:** `berberadam.com` gibi kalıcı bir adres için yılda birkaç dolarlık bir alan adı alıp seçtiğiniz platformda **Domains** bölümünden bağlayın. Sonra `PUBLIC_URL`'yi güncelleyip yeniden yayınlayın.
4. Panelde **Ayarlar → Demo Verilerini Temizle**'ye basıp yer tutucu kayıtları silin ve şifreyi değiştirin.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| `/api/health` 503 veriyor | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` eksik ya da yanlış. Vercel → Settings → Environment Variables; düzeltince **Deployments → ⋯ → Redeploy**. |
| "Deployment blocked: commit author…" | Commit'in yazarı, Vercel'e giriş yaptığınız GitHub hesabı değil. Bu depodaki commit'ler `yusufkotil1-611` adıyla atılıyor; Vercel'e **aynı hesapla** girin. |
| Derleme hata veriyor | Vercel → Deployments → başarısız derleme → log'un son 30 satırını bana gönderin. |
| `/admin` giriş yapılmıyor | `ADMIN_INITIAL_PASSWORD` yalnızca veri tabanı **ilk** oluşurken okunur. Veri tabanı daha önce oluştuysa şifre `000000` ya da önceki şifredir; şifreyi unuttuysanız Turso'da veri tabanını silip yenisini oluşturun (bütün veriler gider). |
| Giriş "çok fazla hatalı deneme" | IP başına 15 dk bekleyin (sayaç veri tabanında tutulur). |
| İlk açılış 1–2 sn yavaş | Sunucusuz yapıda uzun süre kullanılmayan site "soğuk başlar"; sonraki istekler hızlıdır. |
