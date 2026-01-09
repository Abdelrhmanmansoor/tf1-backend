# CV Builder Deployment Guide for tf1one.com

## نظرة عامة على الدمج

يتم دمج نظام CV Builder مع منصة tf1one.com في المسار:
```
https://www.tf1one.com/jobs/cv-builder
```

---

## مراحل الدمج (3 مراحل)

### المرحلة 1: إعداد البيئة والخوادم

#### 1.1 متطلبات النظام

```bash
# نظام التشغيل
- Linux (Ubuntu 20.04 LTS أو أحدث) أو Windows Server 2019+

# البرامج المطلوبة
- Docker & Docker Compose
- Node.js 18+ LTS
- PostgreSQL 16+
- Redis 7+
- Nginx
- Git

# الموارد الموصى بها
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- Bandwidth: 100+ Mbps
```

#### 1.2 إعداد الخادم

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# إنشاء مجلدات البيانات
sudo mkdir -p /data/{uploads,logs,backups,postgres,redis}
sudo chown -R $USER:$USER /data
```

#### 1.3 إعداد المتغيرات البيئية

```bash
# Backend
cd /opt/cv-system/backend
cat > .env.production << 'EOF'
# Database
DATABASE_URL=postgresql://cv_user:$(openssl rand -base64 32)@postgres:5432/cv_system_prod

# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=7d

# API
API_URL=https://api.tf1one.com
FRONTEND_URL=https://www.tf1one.com

# CORS
CORS_ORIGIN=https://www.tf1one.com

# File Upload
UPLOAD_DIR=/data/uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_DIR=/data/logs
EOF

# Frontend
cd /opt/cv-system/frontend
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.tf1one.com/api/v1
NEXT_PUBLIC_FRONTEND_URL=https://www.tf1one.com
NEXT_PUBLIC_CV_BUILDER_ENABLED=true
EOF
```

---

### المرحلة 2: بناء وتشغيل الخدمات

#### 2.1 بناء صور Docker

```bash
# الذهاب إلى مجلد المشروع
cd /opt/cv-system

# بناء Backend Image
docker build -t cv-system-backend:latest -f tf1-backend/Dockerfile tf1-backend/

# بناء Frontend Image
docker build -t cv-system-frontend:latest -f tf1-frontend/Dockerfile tf1-frontend/

# التحقق من الصور
docker images | grep cv-system
```

#### 2.2 تشغيل Docker Compose

```bash
# تشغيل جميع الخدمات
docker-compose -f docker-compose.yml up -d

# التحقق من حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f backend   # سجلات Backend
docker-compose logs -f frontend  # سجلات Frontend
docker-compose logs -f postgres  # سجلات قاعدة البيانات
```

#### 2.3 إعداد قاعدة البيانات

```bash
# تشغيل الهجرات
docker-compose exec backend npm run prisma:migrate:deploy

# ملء البيانات الأولية (اختياري)
docker-compose exec backend npm run seed

# التحقق من الاتصال
docker-compose exec postgres psql -U cv_user -d cv_system_prod -c "\dt"
```

#### 2.4 اختبار الخدمات

```bash
# اختبار Backend API
curl http://localhost:3001/api/health

# يجب أن تحصل على:
# {
#   "status": "ok",
#   "database": "connected",
#   "redis": "connected"
# }

# اختبار Frontend
curl http://localhost:3000

# اختبار قاعدة البيانات
docker-compose exec postgres psql -U cv_user -d cv_system_prod -c "SELECT version();"
```

---

### المرحلة 3: إعداد Nginx والشهادات

#### 3.1 تثبيت Certbot (Let's Encrypt)

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
sudo certbot certonly --standalone -d tf1one.com -d www.tf1one.com -d api.tf1one.com

# تجديد الشهادات تلقائياً
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### 3.2 إعداد Nginx

```bash
# إنشاء ملف الإعدادات
sudo tee /etc/nginx/sites-available/tf1one.com > /dev/null << 'EOF'
upstream cv_api {
    server localhost:3001;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name tf1one.com www.tf1one.com api.tf1one.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.tf1one.com;

    ssl_certificate /etc/letsencrypt/live/tf1one.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tf1one.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/v1/cv/ {
        proxy_pass http://cv_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
    }

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 443 ssl http2;
    server_name api.tf1one.com;

    ssl_certificate /etc/letsencrypt/live/tf1one.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tf1one.com/privkey.pem;

    location / {
        proxy_pass http://cv_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/tf1one.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## قائمة التحقق من الدمج (Deployment Checklist)

### قبل الدمج

- [ ] تثبيت Docker و Docker Compose
- [ ] إنشاء مجلدات البيانات
- [ ] إعداد المتغيرات البيئية
- [ ] تكوين قاعدة البيانات
- [ ] إعداد النسخ الاحتياطية
- [ ] إعداد الشهادات (SSL/TLS)
- [ ] إعداد جدران الحماية

### أثناء الدمج

- [ ] بناء صور Docker
- [ ] تشغيل الخدمات
- [ ] تشغيل الهجرات
- [ ] اختبار الاتصالات
- [ ] التحقق من السجلات
- [ ] اختبار الواجهات

### بعد الدمج

- [ ] اختبار عام شامل
- [ ] اختبار الأداء
- [ ] اختبار الأمان
- [ ] اختبار على الهاتف الذكي
- [ ] اختبار تسجيل الدخول/الخروج
- [ ] اختبار إنشاء السيرة الذاتية
- [ ] اختبار التصدير/الاستيراد
- [ ] مراجعة السجلات
- [ ] إعداد المراقبة
- [ ] توثيق التكوينات

---

## اختبار الدمج

### 1. اختبار التوافقية

```bash
# اختبار Browser Compatibility
# Chrome 90+
# Firefox 88+
# Safari 14+
# Edge 90+
# Mobile: iOS Safari 14+, Chrome Android

# اختبار الأجهزة
# Desktop: 1920x1080, 1366x768
# Tablet: iPad (768x1024), Android Tablet
# Mobile: iPhone 12/13, Samsung S21/S22
```

### 2. اختبار الأداء

```bash
# تحميل الصفحة
Lighthouse score: 90+
First Contentful Paint: < 1.5s
Largest Contentful Paint: < 2.5s
Time to Interactive: < 3.5s

# استجابة API
Backend response time: < 200ms
PDF generation: < 5s
File upload: < 30s

# استهلاك الذاكرة
Frontend: < 50MB
Backend: < 100MB
Database: < 500MB
```

### 3. اختبار الأمان

```bash
# SSL/TLS
- A+ rating on SSL Labs
- TLS 1.2+
- Strong ciphers

# Authentication
- JWT token validation
- Session timeout
- Password hashing (bcrypt)

# Authorization
- Role-based access control
- Resource ownership verification
- API endpoint protection

# Data Protection
- Encrypted password fields
- Encrypted file uploads
- CORS validation
```

### 4. اختبار الميزات

```bash
# إنشاء السيرة الذاتية
- [ ] إنشاء سيرة ذاتية جديدة
- [ ] ملء البيانات الشخصية
- [ ] إضافة خبرات عملية
- [ ] إضافة تعليم
- [ ] إضافة مهارات
- [ ] إضافة شهادات

# تحرير السيرة الذاتية
- [ ] تحديث البيانات
- [ ] حذف أقسام
- [ ] إعادة ترتيب الأقسام
- [ ] حفظ تلقائي

# القوالب
- [ ] اختيار قالب
- [ ] تغيير القالب
- [ ] معاينة القالب
- [ ] تطبيق القالب

# التصدير
- [ ] تصدير PDF
- [ ] تصدير HTML
- [ ] تصدير JSON
- [ ] مشاركة رابط عام

# الاستيراد
- [ ] استيراد من JSON Resume
- [ ] استيراد من YAML
- [ ] استيراد من LinkedIn CSV
```

---

## المراقبة والصيانة

### 1. المراقبة اليومية

```bash
# التحقق من حالة الخدمات
docker-compose ps

# عرض السجلات
tail -f /data/logs/backend.log
tail -f /data/logs/access.log
tail -f /data/logs/error.log

# التحقق من استخدام الموارد
docker stats

# التحقق من حجم قاعدة البيانات
docker-compose exec postgres du -sh /var/lib/postgresql/data
```

### 2. المراقبة الأسبوعية

```bash
# التحقق من النسخ الاحتياطية
ls -lah /data/backups/

# تنظيف السجلات القديمة
find /data/logs -name "*.log" -mtime +7 -delete

# تحديث الحزم
docker-compose pull
docker-compose up -d

# فحص الأداء
docker exec postgres psql -U cv_user -d cv_system_prod -c "SELECT * FROM pg_stat_statements LIMIT 10;"
```

### 3. النسخ الاحتياطية

```bash
# نسخة احتياطية يومية
0 2 * * * /opt/cv-system/backup.sh >> /data/logs/backup.log 2>&1

# نسخة احتياطية أسبوعية
0 3 * * 0 /opt/cv-system/backup-weekly.sh >> /data/logs/backup.log 2>&1

# نسخة احتياطية شهرية
0 4 1 * * /opt/cv-system/backup-monthly.sh >> /data/logs/backup.log 2>&1
```

---

## حل المشاكل

### الخدمة لا تستجيب

```bash
# التحقق من حالة الخدمة
docker-compose ps backend

# عرض السجلات
docker-compose logs backend

# إعادة تشغيل الخدمة
docker-compose restart backend

# إعادة بناء الخدمة
docker-compose up -d --build backend
```

### مشاكل قاعدة البيانات

```bash
# التحقق من الاتصال
docker-compose exec postgres psql -U cv_user -d cv_system_prod -c "SELECT 1"

# عرض الجداول
docker-compose exec postgres psql -U cv_user -d cv_system_prod -c "\dt"

# إعادة تشغيل PostgreSQL
docker-compose restart postgres
```

### مشاكل Frontend

```bash
# حذف الذاكرة المؤقتة
docker-compose exec frontend rm -rf .next

# إعادة بناء Frontend
docker-compose up -d --build frontend

# التحقق من المتغيرات البيئية
docker-compose exec frontend env | grep NEXT_PUBLIC
```

---

## الدعم والمساعدة

### الإيميل
support@tf1one.com

### المركز
https://www.tf1one.com/help-center

### الهاتف
+966 (12) 345 6789

### الساعات
من السبت إلى الخميس: 9 صباحاً - 6 مساءً (التوقيت السعودي)

---

**نسخة الدليل**: 1.0  
**آخر تحديث**: 9 يناير 2026  
**الحالة**: جاهز للإنتاج ✅  
**الدعم**: متوفر 24/7 ✅
