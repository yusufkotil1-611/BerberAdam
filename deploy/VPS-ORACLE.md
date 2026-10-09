# Alternatif Kılavuz — Kendi Sunucunuz (Oracle Cloud + DuckDNS)

> **Önerilen yol Netlify + Turso'dur ([DEPLOY.md](../DEPLOY.md)): sunucu kurulumu gerektirmez.** Bu kılavuz, uygulamayı kendi sunucunuzda (VPS) yerel SQLite dosyasıyla çalıştırmak isterseniz içindir. Node.js **22.13 veya üstü** gerekir.
> Komutlardaki `deploy/...` yolları proje klasörüne göredir.

Hedef: iki ayrı ücretsiz adres

| Adres (örnek) | Ne gösterir |
|---|---|
| `https://berberadam.duckdns.org` | Müşteri sitesi + online randevu. `/admin` burada **hiç yoktur** (404). |
| `https://berberadam-yonetim.duckdns.org` | Yalnızca yönetim paneli. Ana sayfa yok. |

Kullanılan ücretsiz parçalar: **DuckDNS** (alan adı) · **Oracle Cloud Always Free** (sunucu) · **Caddy** (otomatik HTTPS) · **systemd** (sunucu kendiliğinden başlasın/yeniden başlasın).

> Hesap açma adımlarını (DuckDNS, Oracle) sizin yapmanız gerekir; kimlik/kart bilgisi istedikleri için bunları sizin yerinize ben yapamam. Aşağıdaki her şey sırasıyla kopyala-yapıştır olacak şekilde yazıldı.
> Bu kılavuzdaki sunucu adımlarını gerçek bir Oracle makinesinde çalıştırmadım; uygulama tarafını (alan adı ayrımı, ortam dosyası, yedekleme) ise yerelde test ettim. Oracle ekranlarının adları zamanla değişebilir.

---

## 0. Önce kendi bilgisayarınızda deneyin (isteğe bağlı)

İki alan adı mantığını yerelde görmek için (`*.localhost` adresleri otomatik olarak bu bilgisayara gider):

```powershell
$env:ADMIN_HOST = "yonetim.localhost:3000"
npm run dev
```

- <http://localhost:3000> → müşteri sitesi (`/admin` → 404)
- <http://yonetim.localhost:3000> → yönetim paneli

---

## 1. DuckDNS'ten iki ücretsiz alan adı alın

1. <https://www.duckdns.org> → Google/GitHub vb. ile giriş yapın.
2. **Domains** bölümünden iki alt alan adı ekleyin, örneğin `berberadam` ve `berberadam-yonetim` (biri alınmışsa başka isim deneyin, örn. `berberadam-erenler`).
3. Sayfanın üstündeki **token**'ı bir yere kaydedin (şifre gibi saklayın).

IP adreslerini sunucuyu kurunca gireceğiz.

## 2. Oracle Cloud'da ücretsiz sunucu oluşturun

1. <https://www.oracle.com/cloud/free/> → hesap açın. Kimlik doğrulaması için kredi/banka kartı ister; Always Free kaynaklarda ücret çekilmez.
2. **Bölge (Home region):** size yakın bir bölge seçin (ör. Frankfurt). Sonradan değiştirilemez.
3. **Compute → Instances → Create instance:**
   - **Image:** Ubuntu 24.04 (veya 22.04)
   - **Shape:** `VM.Standard.A1.Flex` (Ampere, ARM) — Always Free sınırları içinde 1 OCPU / 6 GB RAM yeterlidir. "Out of capacity" hatası alırsanız birkaç saat sonra tekrar deneyin ya da `VM.Standard.E2.1.Micro` (1 GB RAM; 5. adımdaki *swap* şart) seçin.
   - **Networking:** "Assign a public IPv4 address" açık olsun.
   - **SSH keys:** "Generate a key pair" → **özel anahtarı (.key) indirin**, kaybetmeyin.
4. Makine açılınca **genel IP** adresini not edin.
5. **Port açma (Oracle tarafı):** Instance → Subnet → **Security List** → *Add Ingress Rules*: kaynak `0.0.0.0/0`, protokol TCP, hedef port `80`; ikinci kural için `443`.
6. **DuckDNS'e dönün:** iki alan adının **current ip** kutusuna bu IP'yi yazıp *update ip* deyin.

> **Önemli — boşta kalma riski:** Oracle, uzun süre neredeyse hiç kullanılmayan Always Free makineleri geri alabiliyor. Berber sitesi düşük trafikli olduğu için bu ihtimal var. Hesabı "Pay As You Go" planına yükseltmek (Always Free limitleri içinde yine ücret çıkmaz) bu riski genelde ortadan kaldırır; güncel koşulları Oracle sayfasından kontrol edin. Her durumda aşağıdaki **yedekleri** düzenli indirin.

## 3. Sunucuya bağlanın

Windows PowerShell'de (anahtar dosyanızın yolunu yazın):

```powershell
ssh -i C:\Users\messi\Downloads\ssh-key.key ubuntu@SUNUCU_IP
```

İlk sorulan "yes/no" sorusuna `yes` deyin. Aşağıdaki "sunucuda" komutları bu pencerede çalışır.

## 4. Sunucuda güvenlik duvarını açın (Ubuntu iptables)

Oracle'ın Ubuntu imajları 80/443'ü varsayılan olarak engeller:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 5. Gerekli programları kurun

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y curl build-essential

# Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (otomatik HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

node -v   # v22.x görmelisiniz
```

**Yalnızca 1 GB RAM'li makinede** (derleme sırasında bellek yetmesin diye 2 GB takas alanı):

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 6. Projeyi sunucuya gönderin

**Kendi bilgisayarınızda** (PowerShell) — `node_modules`, `.next` ve yerel veri tabanı hariç paketleyip gönderir:

```powershell
cd C:\Users\messi\Desktop
tar --exclude=BERBERADAM/node_modules --exclude=BERBERADAM/.next --exclude=BERBERADAM/data --exclude=BERBERADAM/backups --exclude=BERBERADAM/.env.local --exclude=BERBERADAM/.env.production.local -czf berberadam.tgz BERBERADAM
scp -i C:\Users\messi\Downloads\ssh-key.key berberadam.tgz ubuntu@SUNUCU_IP:~
```

**Sunucuda:**

```bash
cd ~ && tar -xzf berberadam.tgz
cd ~/BERBERADAM
```

## 7. Ayarları yazın

```bash
nano ~/BERBERADAM/.env.production.local
```

İçine (alan adlarınızı ve **kendi seçeceğiniz güçlü şifreyi** yazın):

```
ADMIN_HOST=berberadam-yonetim.duckdns.org
PUBLIC_URL=https://berberadam.duckdns.org
ADMIN_INITIAL_PASSWORD=BURAYA-GUCLU-BIR-SIFRE
```

Kaydedin (`Ctrl+O`, `Enter`, `Ctrl+X`) ve dosyayı koruyun:

```bash
chmod 600 ~/BERBERADAM/.env.production.local
```

> `ADMIN_INITIAL_PASSWORD` sayesinde panel, internete açıldığı ilk saniyeden itibaren herkesin bildiği `000000` yerine **sizin şifrenizle** açılır. Yalnızca veri tabanı ilk oluşurken okunur; sonra panelden (Ayarlar → Şifre Değiştir) değiştirebilirsiniz. Bu değişkeni boş bırakırsanız şifre `000000` olur — o durumda siteyi açmadan önce DNS'i bağlamayın.

## 8. Derleyin ve servis olarak başlatın

```bash
cd ~/BERBERADAM
npm ci
npm run build

sudo cp deploy/berberadam.service /etc/systemd/system/berberadam.service
sudo systemctl daemon-reload
sudo systemctl enable --now berberadam

systemctl status berberadam --no-pager     # "active (running)" görmelisiniz
curl -I http://127.0.0.1:3000              # 200 dönmeli
```

> Servis dosyası kullanıcı adının `ubuntu` ve klasörün `/home/ubuntu/BERBERADAM` olduğunu varsayar (Ubuntu imajlarında böyledir). Farklıysa `deploy/berberadam.service` içinde düzeltin.

## 9. Caddy'yi yapılandırın (HTTPS + iki alan adı)

```bash
sudo cp ~/BERBERADAM/deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile     # iki alan adını kendinizinkilerle değiştirin
sudo systemctl reload caddy
journalctl -u caddy -n 30 --no-pager   # "certificate obtained successfully" aramak için
```

Caddy sertifikaları (Let's Encrypt) kendisi alır ve yeniler. Bunun için DNS'in sunucu IP'sine bakıyor olması ve 80/443'ün açık olması gerekir.

## 10. DuckDNS'i otomatik güncel tutun (önerilir)

Sunucunun IP'si bir gün değişirse siteniz kapanmasın:

```bash
echo "DUCKDNS-TOKENINIZ" > ~/.duckdns-token && chmod 600 ~/.duckdns-token
nano ~/BERBERADAM/deploy/duckdns-update.sh        # DOMAINS satırındaki iki adı düzeltin (duckdns.org yazmadan)
chmod +x ~/BERBERADAM/deploy/duckdns-update.sh
crontab -e
```

Açılan dosyanın sonuna ekleyin:

```
*/5 * * * * /home/ubuntu/BERBERADAM/deploy/duckdns-update.sh >> /home/ubuntu/duckdns.log 2>&1
0 3 * * * cd /home/ubuntu/BERBERADAM && /usr/bin/node scripts/backup-db.mjs >> /home/ubuntu/backup.log 2>&1
```

(İkinci satır her gece 03:00'te veri tabanı yedeği alır — bkz. *Yedekleme*.)

## 11. Kontrol listesi

- [ ] `https://berberadam.duckdns.org` → site açılıyor, kilit simgesi var
- [ ] `https://berberadam.duckdns.org/admin` → **404** (olması gereken bu)
- [ ] `https://berberadam-yonetim.duckdns.org` → yönetim girişine yönleniyor
- [ ] `ADMIN_INITIAL_PASSWORD`'deki şifreyle giriş yapabiliyorsunuz; `000000` **reddediliyor**
- [ ] Siteden deneme randevusu alıp panelde görüyorsunuz
- [ ] Panelde **Ayarlar → Demo Verilerini Temizle** ile yer tutucu yorumları kaldırdınız ve gerçek bilgileri girdiniz (fiyatlar, personel, saatler)

---

## Yedekleme

Veri tabanı sunucudaki `~/BERBERADAM/data/` klasöründedir. Oracle bu diski sizin için yedeklemez.

- **Otomatik:** 10. adımdaki cron satırı her gece `~/BERBERADAM/backups/` içine yedek alır (son 14 gün saklanır).
- **Kendi bilgisayarınıza indirme** (haftada bir yeterli):

```powershell
scp -i C:\Users\messi\Downloads\ssh-key.key -r ubuntu@SUNUCU_IP:~/BERBERADAM/backups C:\Users\messi\Desktop\berberadam-yedekler
```

- **Geri yükleme:** servisi durdurun (`sudo systemctl stop berberadam`), yedek dosyasını `data/berberadam.db` olarak kopyalayın (varsa `berberadam.db-wal` ve `-shm` dosyalarını silin), servisi başlatın.

## Güncelleme (kodu değiştirdiğinizde)

6. adımdaki paketleme + `scp` komutlarını tekrarlayın, sonra sunucuda:

```bash
cd ~ && tar -xzf berberadam.tgz     # data/ klasörüne dokunmaz (pakete eklenmedi)
cd ~/BERBERADAM && npm ci && npm run build
sudo systemctl restart berberadam
```

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Tarayıcı "bağlanamıyor / zaman aşımı" | Oracle Security List'te 80/443 kuralı, 4. adımdaki iptables komutları ve DuckDNS'teki IP doğru mu? |
| Sertifika alınamadı (`journalctl -u caddy`) | DNS henüz yayılmamış olabilir (birkaç dakika bekleyin); 80 portu açık olmalı; Caddyfile'daki adlar DuckDNS'tekiyle birebir aynı mı? |
| 502 Bad Gateway | Uygulama çalışmıyor: `systemctl status berberadam`, `journalctl -u berberadam -n 50` |
| `npm run build` "killed" / bellek hatası | 5. adımdaki swap'ı ekleyin |
| Yönetim alan adında 404 | `.env.production.local` içindeki `ADMIN_HOST`, tarayıcıda yazdığınız adresle birebir aynı mı? Değiştirdiyseniz `sudo systemctl restart berberadam` |
| Giriş "çok fazla hatalı deneme" | IP başına 15 dk bekleyin ya da `sudo systemctl restart berberadam` (sayaç bellekte tutulur) |

## Kendi alan adınızı alırsanız

Gerçek bir alan adı (`berberadam.com` gibi) aldığınızda: iki A kaydını sunucu IP'sine yönlendirin, `Caddyfile`'a yeni adları ekleyin (eskileri silmeden de çalışır), `.env.production.local` içinde `ADMIN_HOST` ve `PUBLIC_URL`'yi güncelleyin ve `sudo systemctl restart berberadam && sudo systemctl reload caddy` çalıştırın. Ek kod değişikliği gerekmez. `ADMIN_HOST` virgülle birden fazla adres kabul eder.

> Not: Ücretsiz ve kalıcı gerçek bir `.com`/`.com.tr` alan adı yoktur (Freenom kapandı). `duckdns.org` gibi alt alan adları ücretsizdir ama alan adı sizin değil, DuckDNS'indir. Müşteriye göstereceğiniz kalıcı bir marka adresi istiyorsanız, yıllık birkaç yüz TL'lik bir alan adı almak ileride iyi bir yatırımdır.

## Güvenlik özeti

- Next.js yalnızca `127.0.0.1`'de dinler; dışarıya sadece Caddy açıktır (HTTPS zorunlu, HSTS açık).
- Yönetim girişi müşteri sitesinde yoktur (404); oturum çerezi yalnızca yönetim alan adına aittir (`httpOnly`, `Secure`, `SameSite=Strict`).
- Giriş denemeleri sınırlıdır (IP başına 15 dk'da 5; toplamda saatte 100).
- Yine de **güçlü bir şifre** seçin: 6 haneli rakam şifre internete açık bir panel için zayıftır.
