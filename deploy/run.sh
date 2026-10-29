#!/usr/bin/env bash
# =============================================================
#  Nexora — build + start on the VPS (run from the project root)
#  Prereq: deploy/setup.sh already ran on this machine
# =============================================================
set -e
cd "$(dirname "$0")/.."

echo "== 1. dependencies + prisma client =="
npm install

echo "== 2. production build =="
npm run build

echo "== 3. start under PM2 =="
mkdir -p logs
pm2 start deploy/ecosystem.config.cjs || pm2 restart nexora
pm2 save

echo "== 4. check =="
sleep 4
curl -s -o /dev/null -w "local app: HTTP %{http_code}\n" http://127.0.0.1:3000/

cat <<'TIP'

== app is live on port 3000 (behind nginx on port 80) ==

HTTPS (after the domain's DNS points to this server):
  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d your-domain.com

ZarinPal panel — register this callback URL:
  https://your-domain.com/api/billing/callback

Google Cloud Console — add this redirect URI:
  https://your-domain.com/api/auth/google/callback

Useful:
  pm2 logs nexora     # live logs
  pm2 restart nexora  # after code updates (rebuild first!)
TIP
