# راهنمای استقرار نکسورا روی VPS — از صفر تا آنلاین (۱۵ دقیقه کار سرور)

> این کیت برای وقتی است که دامنه و VPS گرفتی. همه‌ی فایل‌های لازم همین پوشه‌اند.

## آنچه نیاز داری

| مورد | حدود هزینه | توضیح |
|---|---|---|
| VPS ابرآ (ابرا، پارس‌پک، لیارا…) | ~۲۰۰–۴۰۰ هزار تومان/ماه | اوبونتو ۲۲/۲۴، حداقل ۲GB رم — حتماً لوکیشن ایران برای دسترسی سریع |
| دامنه | ~۱۵۰–۳۰۰ هزار تومان/سال | از ایرنیک یا هر ثبت‌کننده |
| حساب زرین‌پال | رایگان شروع | pageno.zarinpal.com — با کد ملی و شبا |

## مسیر ۵ قدمی

### قدم ۱ — اتصال DNS
در پنل دامنه، یک رکورد A بساز که دامنه (مثلاً `nexora.yourdomain.com`) به IP سرور اشاره کند و ۵–۳۰ دقیقه صبر کن.

### قدم ۲ — آماده‌سازی سرور
```bash
ssh root@SERVER_IP
# پروژه را روی سرور ببر (git clone یا scp) — مثلاً در /var/www/nexora
cd /var/www/nexora
bash deploy/setup.sh nexora.yourdomain.com
```
این اسکریپت خودش نصب می‌کند: Node 20 + PM2 + Nginx + فایروال + کانفیگ پروکسی.

### قدم ۳ — اجرای اپ
```bash
bash deploy/run.sh
```
بیلد production می‌گیرد، با PM2 بالا می‌آورد و روی پورت ۳۰۰۰ پشت Nginx سرو می‌شود. سایت الان روی `http://nexora.yourdomain.com` زنده است.

### قدم ۴ — HTTPS (اجباری برای درگاه)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d nexora.yourdomain.com
```
گواهی رایگان Let's Encrypt — خودکار تمدید می‌شود.

### قدم ۵ — اتصال درگاه و گوگل
1. در پنل زرین‌پال، این Callback URL را ثبت کن:
   `https://nexora.yourdomain.com/api/billing/callback`
2. Merchant ID را در فایل `.env` سرور بگذار:
   ```
   ZARINPAL_MERCHANT_ID="کد ۳۶ رقمی پنل"
   ZARINPAL_SANDBOX="0"
   PUBLIC_BASE_URL="https://nexora.yourdomain.com"
   ```
3. در Google Cloud Console هم این Redirect URI را اضافه کن:
   `https://nexora.yourdomain.com/api/auth/google/callback`
4. ری‌استارت: `pm2 restart nexora`

## یادداشت‌های مهم

- **دیتابیس**: فعلاً SQLite است و همراه پروژه حمل می‌شود (`data/nexora.db`). برای بکاپ روزانه کافی است یک cron بگذار که این فایل را کپی کند:
  `0 3 * * * cp /var/www/nexora/data/nexora.db /var/backups/nexora-$(date +\%F).db`
- **مهاجرت به PostgreSQL** (وقتی کاربرها زیاد شد): فقط `datasource` در `prisma/schema.prisma` را عوض کن + `prisma migrate` — کد اپلیکیشن دست نمی‌خورد.
- **اینماد**: برای شروع با زرین‌پال لازم نیست؛ برای درگاه‌های بانکی مستقیم و سقف بالاتر بعداً بگیر.
- **سامانه مودیان**: برای فاکتور رسمی B2B در آینده باید اتصال اضافه شود — در نقشه‌ی راه بگذار.
- **به‌روزرسانی کد**: فایل‌های جدید را ببر روی سرور → `npm run build` → `pm2 restart nexora`
- **حساب‌های دموی فعلی** در دیتابیس هستند (admin@nexora.ir و…) — قبل از فروش واقعی یا عوضشان کن یا حذفشان کن.

## عیب‌یابی سریع

| مشکل | چک کن |
|---|---|
| سایت بالا نمی‌آید | `pm2 logs nexora` و `pm2 status` |
| 502 از nginx | اپ روی ۳۰۰۰ بالا نیست → `pm2 restart nexora` |
| درگاه خطا داد | `.env` سرور: `ZARINPAL_MERCHANT_ID` و `PUBLIC_BASE_URL` درست‌اند؟ Callback در پنل ثبت است؟ |
| ورود گوگل خطا داد | Redirect URI جدید در Google Console اضافه شده؟ |
