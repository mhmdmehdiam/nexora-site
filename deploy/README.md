# استقرار Nexora روی سرور (Production)

راهنمای کامل از صفر تا سایت زنده با HTTPS.

---

## پیش‌نیازها

| مورد | حداقل |
|---|---|
| سرور | Ubuntu 22.04 / 24.04 — ۴ هسته، ۸GB RAM، ۵۰GB SSD |
| دامنه | یک دامنه با دسترسی به DNS |
| دسترسی | `sudo` روی سرور |

> برای ۱۰۰۰ کاربر همزمان، ۴ هسته و ۸GB RAM کافی است (تست‌شده).

---

## ۱. نصب پیش‌نیازها

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx postgresql postgresql-contrib

node -v   # باید v22.x باشد
```

---

## ۲. ساخت دیتابیس PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER nexora WITH PASSWORD 'یک-رمز-قوی-بگذار';
CREATE DATABASE nexora OWNER nexora;
ALTER USER nexora SET statement_timeout = '30s';
SQL
```

تنظیمات performance (اختیاری، برای سرور ۸GB):

```bash
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 300;"
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '2GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_cache_size = '6GB';"
sudo systemctl restart postgresql
```

---

## ۳. استقرار کد

```bash
sudo useradd -m -s /bin/bash nexora
sudo mkdir -p /var/www/nexora
sudo chown nexora:nexora /var/www/nexora

sudo -u nexora git clone <repo-url> /var/www/nexora
cd /var/www/nexora

sudo -u nexora npm ci
```

---

## ۴. تنظیم `.env`

```bash
sudo -u nexora cp .env.example .env
sudo -u nexora nano .env
```

حداقل این‌ها را پر کن:

```env
DATABASE_URL="postgresql://nexora:رمز@localhost:5432/nexora?schema=public&connection_limit=30&pool_timeout=20"

# یک رشته تصادفی ≥۳۲ کاراکتر
JWT_SECRET="$(openssl rand -base64 48)"

PUBLIC_BASE_URL="https://nexora.ir"

# پرداخت
ZARINPAL_MERCHANT_ID="..."
ZARINPAL_SANDBOX="0"

# cron بازیابی پرداخت‌ها
CRON_SECRET="$(openssl rand -base64 32)"

# مانیتورینگ (اختیاری)
# SENTRY_DSN="..."
```

`PUBLIC_BASE_URL` **بسیار مهم است** — بدون آن، callback درگاه پرداخت به پورت داخلی می‌رود.

---

## ۵. Migration و build

```bash
cd /var/www/nexora
sudo -u nexora npx prisma migrate deploy
sudo -u nexora npx prisma generate
sudo -u nexora npx next build
```

---

## ۶. سرویس systemd

```bash
sudo cp deploy/nexora.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nexora
sudo systemctl status nexora
```

تست:

```bash
curl -f http://localhost:3100/api/health
```

---

## ۷. nginx

```bash
# config را کپی و دامنه را جایگزین کن
sudo cp deploy/nginx.conf /etc/nginx/sites-available/nexora
sudo sed -i 's/nexora.ir/your-domain.com/g' /etc/nginx/sites-available/nexora

# قبل از SSL، بلوک 443 را موقتاً کامنت کن
sudo nano /etc/nginx/sites-available/nexora

sudo ln -s /etc/nginx/sites-available/nexora /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## ۸. HTTPS با Let's Encrypt

```bash
sudo bash deploy/setup-ssl.sh your-domain.com admin@your-domain.com
```

بعد از صدور گواهی، بلوک 443 را از کامنت خارج کن:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

تست:

```bash
curl -f https://your-domain.com/api/health
```

---

## ۹. بکاپ خودکار

```bash
# تست دستی
sudo -u nexora bash scripts/backup-db.sh

# cron روزانه ۰۳:۱۵
sudo -u nexora crontab -e
```

```cron
15 3 * * * cd /var/www/nexora && bash scripts/backup-db.sh >> backups/backup.log 2>&1
```

### بازیابی

```bash
sudo -u nexora bash scripts/restore-db.sh backups/nexora-20261024-031500.sql.gz
```

> ⚠️ restore تمام جداول را drop و بازسازی می‌کند.

---

## ۱۰. cron بازیابی پرداخت‌ها

کاربرانی که بعد از پرداخت مرورگر را می‌بندند، پولشان کم می‌شود ولی پلن فعال نمی‌شود. این cron آن‌ها را نجات می‌دهد:

```cron
*/15 * * * * curl -s -X POST https://your-domain.com/api/billing/reconcile -H "x-cron-secret: $CRON_SECRET" >> /var/log/nexora-reconcile.log 2>&1
```

---

## ۱۱. مانیتورینگ

### Health check (رایگان)

از [UptimeRobot](https://uptimerobot.com) یا [Better Stack](https://betterstack.com):

```
https://your-domain.com/api/health
```

هشدار وقتی status ≠ 200.

### Sentry (اختیاری)

1. در [sentry.io](https://sentry.io) یک پروژه Node بساز
2. DSN را کپی کن
3. در `.env`:

```env
SENTRY_DSN="https://key@o123.ingest.sentry.io/456"
```

4. `sudo systemctl restart nexora`

بدون DSN هم همه‌ی خطاها به‌صورت JSON در journald ثبت می‌شوند:

```bash
sudo journalctl -u nexora -f | grep '"level":"error"'
```

---

## ۱۲. CI/CD

فایل `.github/workflows/ci.yml` آماده است. روی هر push به `main`:

1. type-check
2. تست‌های مالی (۶۲ تست)
3. build
4. smoke test با PostgreSQL واقعی
5. تست login و API

اگر هر مرحله fail شود، merge بلاک می‌شود.

### deploy خودکار (اختیاری)

در GitHub → Settings → Secrets:

| Secret | مقدار |
|---|---|
| `SSH_HOST` | IP سرور |
| `SSH_USER` | `nexora` |
| `SSH_KEY` | private key |

سپس یک job اضافه کن:

```yaml
deploy:
  needs: build-and-smoke
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy
      run: |
        ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} '
          cd /var/www/nexora &&
          git pull &&
          npm ci &&
          npx prisma migrate deploy &&
          npx next build &&
          sudo systemctl restart nexora
        '
```

---

## چک‌لیست نهایی

- [ ] `curl -f https://domain/api/health` → 200
- [ ] `https://domain` باز می‌شود
- [ ] login با `admin@nexora.ir` کار می‌کند
- [ ] گواهی SSL معتبر است (`https://www.ssllabs.com/ssltest/`)
- [ ] بکاپ اول گرفته شد (`ls backups/`)
- [ ] cron بکاپ تنظیم شد
- [ ] cron reconcile تنظیم شد
- [ ] UptimeRobot روی `/api/health` هشدار می‌دهد
- [ ] `sudo journalctl -u nexora -f` لاگ نشان می‌دهد

---

## عیب‌یابی

| مشکل | علت | راه‌حل |
|---|---|---|
| 502 Bad Gateway | cluster بالا نیست | `sudo systemctl status nexora` |
| redirect به `:3104` | `PUBLIC_BASE_URL` تنظیم نشده | در `.env` تنظیم و restart |
| خطای اتصال دیتابیس | رمز یا `max_connections` | `psql` را مستقیم تست کن |
| build شکست می‌خورد | RAM کم | `NODE_OPTIONS=--max-old-space-size=4096` |
| کندی بعد از deploy | کش سرد | چند درخواست اول کند است، طبیعی است |

---

## به‌روزرسانی

```bash
cd /var/www/nexora
sudo -u nexora git pull
sudo -u nexora npm ci
sudo -u nexora npx prisma migrate deploy
sudo -u nexora npx next build
sudo systemctl restart nexora
```

Downtime: ~۵ ثانیه (restart سرویس).
