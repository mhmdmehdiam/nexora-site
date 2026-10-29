#!/usr/bin/env bash
#
# Obtain (or renew) a Let's Encrypt certificate for Nexora.
#
#   sudo bash deploy/setup-ssl.sh nexora.ir admin@nexora.ir
#
# Prerequisites:
#   1. DNS A record for the domain (and www) already points at this server.
#   2. Ports 80 and 443 are open in the firewall / cloud security group.
#   3. nginx is installed and the HTTP-only vhost from deploy/nginx.conf
#      is active (so /.well-known/acme-challenge/ is served).
#
# What it does:
#   - installs certbot if missing
#   - issues one certificate covering apex + www
#   - enables automatic renewal via a systemd timer
#   - prints the exact next steps

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "usage: sudo bash deploy/setup-ssl.sh <domain> <email>" >&2
  echo "example: sudo bash deploy/setup-ssl.sh nexora.ir admin@nexora.ir" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "✗ must run as root (sudo)" >&2
  exit 1
fi

echo "→ checking DNS for $DOMAIN"
SERVER_IP="$(curl -s --max-time 10 https://api.ipify.org || true)"
DOMAIN_IP="$(getent hosts "$DOMAIN" | awk '{print $1; exit}' || true)"

if [ -n "$SERVER_IP" ] && [ -n "$DOMAIN_IP" ] && [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
  echo "⚠️  $DOMAIN resolves to $DOMAIN_IP but this server is $SERVER_IP"
  echo "    Let's Encrypt will fail until DNS points here. Continue anyway? [y/N]"
  read -r GO
  [ "$GO" = "y" ] || exit 1
fi

echo "→ installing certbot"
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y certbot python3-certbot-nginx
  else
    echo "✗ unsupported package manager — install certbot manually" >&2
    exit 1
  fi
else
  echo "  certbot already installed ($(certbot --version 2>&1))"
fi

mkdir -p /var/www/certbot

echo "→ requesting certificate for $DOMAIN and www.$DOMAIN"
certbot certonly \
  --nginx \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --domains "$DOMAIN,www.$DOMAIN" \
  --keep-until-expiring

echo
echo "✓ certificate issued"
echo "  /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  /etc/letsencrypt/live/$DOMAIN/privkey.pem"

# --- renewal timer --------------------------------------------------------
if systemctl list-timers 2>/dev/null | grep -q certbot; then
  echo "✓ renewal timer already active"
else
  systemctl enable --now certbot.timer 2>/dev/null || {
    # fallback for systems without the packaged timer
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    echo "✓ added cron-based renewal (daily 03:00)"
  }
fi

echo
echo "next steps:"
echo "  1. update deploy/nginx.conf: replace nexora.ir with $DOMAIN"
echo "  2. nginx -t && systemctl reload nginx"
echo "  3. set PUBLIC_BASE_URL=https://$DOMAIN in .env"
echo "  4. curl -f https://$DOMAIN/api/health"
echo
echo "test renewal without waiting:"
echo "  certbot renew --dry-run"
