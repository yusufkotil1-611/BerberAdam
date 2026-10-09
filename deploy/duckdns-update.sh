#!/usr/bin/env bash
# DuckDNS alan adlarını bu sunucunun güncel genel IP'sine yönlendirir.
# Oracle makinesinin IP'si değişirse (ör. yeniden başlatma) siteniz yine açılır.
#
# Kurulum:
#   1) Token'ınızı bir dosyaya yazın:   echo "TOKEN-BURAYA" > ~/.duckdns-token && chmod 600 ~/.duckdns-token
#   2) Alan adlarını aşağıda düzenleyin (duckdns.org kısmı OLMADAN, virgülle ayırın)
#   3) Çalıştırılabilir yapın:           chmod +x ~/BERBERADAM/deploy/duckdns-update.sh
#   4) Her 5 dakikada bir çalıştırın:    crontab -e  ->
#      */5 * * * * /home/ubuntu/BERBERADAM/deploy/duckdns-update.sh >> /home/ubuntu/duckdns.log 2>&1
set -euo pipefail

DOMAINS="berberadam,berberadam-yonetim"
TOKEN="$(cat "$HOME/.duckdns-token")"

# ip= boş bırakılırsa DuckDNS isteği yapan sunucunun IP'sini kullanır
RESULT="$(curl -fsS "https://www.duckdns.org/update?domains=${DOMAINS}&token=${TOKEN}&ip=")"
echo "$(date '+%F %T') DuckDNS: ${RESULT}"
