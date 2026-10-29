#!/usr/bin/env bash
# =============================================================
#  Nexora — one-shot VPS setup (fresh Ubuntu 22.04/24.04)
#  Run as root:  bash deploy/setup.sh your-domain.com
#  After this: upload the project, run deploy/run.sh
# =============================================================
set -e
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then echo "usage: bash deploy/setup.sh <domain>"; exit 1; fi

echo "== 1. base packages =="
apt update -y
apt install -y curl git nginx

echo "== 2. Node.js 20 LTS =="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "== 3. PM2 =="
npm install -g pm2

echo "== 4. project skeleton =="
mkdir -p /var/www/nexora
echo "upload the project here (see deploy/run.sh)" > /var/www/nexora/README.txt

echo "== 5. nginx site =="
cp /var/www/nexora/deploy/nginx-nexora.conf /etc/nginx/sites-available/nexora 2>/dev/null || true
sed -i "s/nexora.YOURDOMAIN.com/$DOMAIN/g" /etc/nginx/sites-available/nexora 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nexora /etc/nginx/sites-enabled/nexora
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "== 6. firewall =="
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

echo "== DONE. Next: upload the project to /var/www/nexora, then bash deploy/run.sh =="
