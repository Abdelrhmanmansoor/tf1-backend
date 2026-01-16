# 💻 قائمة الأوامر الكاملة | Commands Cheat Sheet
## Job Publisher Automation System

---

## 🚀 أوامر أساسية | Basic Commands

### تشغيل السيرفر | Start Server
```bash
# التطوير Development
npm run dev

# الإنتاج Production
npm start

# مع PM2
pm2 start server.js --name sportx-api
```

### إيقاف السيرفر | Stop Server
```bash
# CTRL + C في terminal

# إيقاف جميع عمليات Node
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force

# إيقاف عملية على منفذ محدد
netstat -ano | findstr :4000
taskkill /PID [PID_NUMBER] /F
```

---

## 🧪 أوامر الاختبار | Testing Commands

### الاختبار الشامل | Comprehensive Testing
```bash
# بدون token
node test-all-apis-comprehensive.js

# مع publisher token
node test-all-apis-comprehensive.js YOUR_PUBLISHER_TOKEN

# مع كلا الـ tokens
node test-all-apis-comprehensive.js PUBLISHER_TOKEN ADMIN_TOKEN

# باستخدام متغيرات البيئة
set PUBLISHER_TOKEN=your_token
set ADMIN_TOKEN=admin_token
node test-all-apis-comprehensive.js

# Linux/Mac
export PUBLISHER_TOKEN="your_token"
export ADMIN_TOKEN="admin_token"
node test-all-apis-comprehensive.js
```

### اختبار نظام الأتمتة | Automation System Test
```bash
node test-automation-system.js
```

### اختبار Subscription Flow
```bash
node test-subscription-flow.js
```

### تشغيل ملف Batch (Windows)
```cmd
run-api-tests.bat
```

---

## 🌐 اختبار APIs بـ cURL

### Health Check
```bash
# Windows PowerShell
Invoke-WebRequest http://localhost:4000/health | Select-Object -ExpandProperty Content

# Linux/Mac/Git Bash
curl http://localhost:4000/health

# مع تنسيق JSON
curl http://localhost:4000/health | jq

# حفظ النتيجة في ملف
curl http://localhost:4000/health > health.json
```

### CSRF Token
```bash
curl http://localhost:4000/api/v1/auth/csrf-token
```

---

## 🔐 Authentication Commands

### تسجيل مستخدم جديد | Register
```bash
# PowerShell
$body = @{
    email = "test@publisher.com"
    password = "Test123!@#"
    role = "job_publisher"
    firstName = "Test"
    lastName = "Publisher"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# cURL
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@publisher.com",
    "password": "Test123!@#",
    "role": "job_publisher",
    "firstName": "Test",
    "lastName": "Publisher"
  }'
```

### تسجيل الدخول | Login
```bash
# PowerShell
$body = @{
    email = "publisher@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$response.Content

# cURL
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "publisher@example.com",
    "password": "password123"
  }'

# حفظ Token في متغير (Linux/Mac)
TOKEN=$(curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"publisher@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')
```

---

## 📊 Subscription Commands

### Get Available Tiers
```bash
# PowerShell
Invoke-WebRequest http://localhost:4000/api/v1/publisher/subscription/tiers

# cURL
curl http://localhost:4000/api/v1/publisher/subscription/tiers
```

### Get My Subscription
```bash
# PowerShell
$TOKEN = "your_jwt_token_here"
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/publisher/subscription" `
    -Headers @{ Authorization = "Bearer $TOKEN" }

# cURL
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/subscription
```

### Upgrade Subscription
```bash
# PowerShell
$body = @{
    tier = "pro"
    billingCycle = "monthly"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/v1/publisher/subscription/upgrade" `
    -Method POST `
    -Headers @{ Authorization = "Bearer $TOKEN" } `
    -ContentType "application/json" `
    -Body $body

# cURL
curl -X POST http://localhost:4000/api/v1/publisher/subscription/upgrade \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro",
    "billingCycle": "monthly"
  }'
```

### Get Usage
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/subscription/usage
```

---

## 📅 Interview Commands

### Schedule Interview
```bash
curl -X POST http://localhost:4000/api/v1/publisher/interviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "507f1f77bcf86cd799439011",
    "type": "online",
    "scheduledAt": "2026-01-25T14:00:00Z",
    "duration": 60,
    "timezone": "Asia/Riyadh",
    "meetingPlatform": "internal",
    "instructionsForApplicant": "Please join 5 minutes early"
  }'
```

### List Interviews
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/publisher/interviews?page=1&limit=10"

# مع فلاتر
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/publisher/interviews?status=scheduled&type=online"
```

### Get Interview Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/interviews/statistics
```

---

## 💬 Messaging Commands

### List Threads
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/publisher/messages/threads?page=1"
```

### Send Message
```bash
curl -X POST http://localhost:4000/api/v1/publisher/messages/threads/THREAD_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! Your interview is scheduled.",
    "contentAr": "مرحباً! تم جدولة مقابلتك."
  }'
```

### Get Unread Count
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/messages/unread-count
```

---

## 🤖 Automation Commands

### List Automation Rules
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/automations
```

### Create Automation Rule
```bash
curl -X POST http://localhost:4000/api/v1/publisher/automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto-notify on shortlist",
    "nameAr": "إشعار تلقائي عند الاختصار",
    "trigger": {
      "event": "APPLICATION_STAGE_CHANGED",
      "conditions": [
        {
          "field": "newStatus",
          "operator": "equals",
          "value": "shortlisted"
        }
      ]
    },
    "actions": [
      {
        "type": "SEND_NOTIFICATION",
        "order": 0,
        "enabled": true,
        "config": {
          "templateKey": "application_stage_changed",
          "priority": "high"
        }
      }
    ],
    "isActive": true
  }'
```

### Toggle Automation Rule
```bash
curl -X POST http://localhost:4000/api/v1/publisher/automations/RULE_ID/toggle \
  -H "Authorization: Bearer $TOKEN"
```

### Test Automation Rule
```bash
curl -X POST http://localhost:4000/api/v1/publisher/automations/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleId": "RULE_ID",
    "testData": {
      "applicationId": "507f...",
      "newStatus": "shortlisted"
    }
  }'
```

### Get Automation Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/automations/statistics
```

---

## 🎛️ Feature Toggle Commands

### Get My Features (Publisher)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/publisher/features
```

### List All Features (Admin)
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:4000/api/v1/admin/features
```

### Enable Feature for Publisher (Admin)
```bash
curl -X POST http://localhost:4000/api/v1/admin/features/FEATURE_ID/enable-for-publisher \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "publisherId": "PUBLISHER_ID",
    "expiresAt": "2027-01-15T23:59:59Z"
  }'
```

---

## 🔔 Notification Commands

### List Notifications
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/publisher/notifications?page=1&unreadOnly=true"
```

### Mark Notification as Read
```bash
curl -X PATCH http://localhost:4000/api/v1/publisher/notifications/NOTIF_ID/read \
  -H "Authorization: Bearer $TOKEN"
```

### Mark All as Read
```bash
curl -X PATCH http://localhost:4000/api/v1/publisher/notifications/mark-all-read \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🗄️ Database Commands

### MongoDB

#### تشغيل MongoDB محلياً
```bash
# Windows
mongod --dbpath C:\data\db

# Linux/Mac
mongod --dbpath /data/db
```

#### الاتصال بـ MongoDB Shell
```bash
mongosh "mongodb://localhost:27017/sportx-platform"
```

#### استعلامات مفيدة
```javascript
// عرض جميع الباقات
db.subscriptions.find().pretty()

// عرض جميع المقابلات
db.interviews.find().pretty()

// عدد المستخدمين
db.users.countDocuments()

// عرض آخر 10 رسائل
db.messages.find().sort({createdAt: -1}).limit(10).pretty()

// حذف بيانات اختبار
db.automationrules.deleteMany({name: /Test/})
```

### Redis

#### تشغيل Redis
```bash
# Windows (WSL)
redis-server

# Linux/Mac
redis-server
```

#### الاتصال بـ Redis CLI
```bash
redis-cli

# اختبار الاتصال
PING  # يجب أن يرجع PONG

# عرض جميع المفاتيح
KEYS *

# حذف جميع البيانات
FLUSHALL
```

---

## 📝 Logs Commands

### عرض Logs
```bash
# Windows PowerShell
Get-Content logs/combined.log -Tail 50

# Windows CMD
type logs\combined.log

# Linux/Mac
tail -f logs/combined.log

# عرض آخر 100 سطر
tail -n 100 logs/combined.log

# البحث في logs
# PowerShell
Select-String -Path logs/combined.log -Pattern "error"

# Linux/Mac
grep "error" logs/combined.log
```

### حذف Logs القديمة
```bash
# Windows PowerShell
Remove-Item logs/*.log

# Linux/Mac
rm logs/*.log
```

---

## 🔧 Maintenance Commands

### تحديث Dependencies
```bash
# تحديث جميع الحزم
npm update

# تحديث حزمة محددة
npm update package-name

# فحص الحزم القديمة
npm outdated
```

### تنظيف Cache
```bash
npm cache clean --force

# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
```

### فحص الأخطاء
```bash
# ESLint
npm run lint

# إصلاح تلقائي
npm run lint:fix
```

---

## 🎨 Development Utilities

### تشغيل مع Debugging
```bash
# Node Inspector
node --inspect server.js

# Nodemon مع Inspect
nodemon --inspect server.js
```

### Environment Variables
```bash
# Windows PowerShell
$env:NODE_ENV="production"
$env:PORT="5000"

# Linux/Mac
export NODE_ENV=production
export PORT=5000

# تشغيل مع env محدد
NODE_ENV=production PORT=5000 node server.js
```

---

## 📦 Postman Commands

### استيراد Collection
```bash
# افتح Postman
# File > Import
# اختر: postman/Job_Publisher_Automation.postman_collection.json
```

### Newman (CLI Postman)
```bash
# تثبيت Newman
npm install -g newman

# تشغيل Collection
newman run postman/Job_Publisher_Automation.postman_collection.json

# مع Environment
newman run collection.json -e environment.json

# تقرير HTML
newman run collection.json --reporters html --reporter-html-export report.html
```

---

## 🚀 Deployment Commands

### Docker (إذا كان موجود)
```bash
# Build image
docker build -t sportx-api .

# Run container
docker run -p 4000:4000 sportx-api

# Docker Compose
docker-compose up -d
docker-compose down
docker-compose logs -f
```

### PM2 (Process Manager)
```bash
# Start
pm2 start server.js --name sportx-api

# Stop
pm2 stop sportx-api

# Restart
pm2 restart sportx-api

# Logs
pm2 logs sportx-api

# Monitor
pm2 monit

# Startup script
pm2 startup
pm2 save
```

---

## 🔍 Debugging Commands

### فحص المنفذ 4000
```bash
# Windows
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :4000
netstat -tuln | grep 4000
```

### فحص عمليات Node
```bash
# Windows PowerShell
Get-Process -Name node

# Linux/Mac
ps aux | grep node
```

### فحص استهلاك الموارد
```bash
# Windows
tasklist /FI "IMAGENAME eq node.exe"

# Linux/Mac
top -p $(pgrep node)
```

---

## 💡 Quick Aliases (اختياري)

إضافة إلى `.bashrc` أو `.zshrc`:

```bash
# تشغيل السيرفر
alias sstart="npm run dev"

# اختبار صحة السيرفر
alias shealth="curl http://localhost:4000/health"

# اختبار شامل
alias stest="node test-all-apis-comprehensive.js"

# عرض logs
alias slogs="tail -f logs/combined.log"

# MongoDB
alias mdb="mongosh mongodb://localhost:27017/sportx-platform"
```

---

## ✅ Checklist Commands

```bash
# 1. تحقق من السيرفر
curl http://localhost:4000/health

# 2. تحقق من MongoDB
mongosh --eval "db.adminCommand('ping')"

# 3. تحقق من Redis
redis-cli ping

# 4. شغّل الاختبارات
node test-all-apis-comprehensive.js

# 5. راجع الـ logs
tail -n 50 logs/combined.log
```

---

**💡 نصيحة:** احفظ الأوامر المستخدمة بكثرة في ملف `scripts` في `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "node test-all-apis-comprehensive.js",
    "test:auto": "node test-automation-system.js",
    "logs": "tail -f logs/combined.log",
    "db:seed": "node seeders/seed.js"
  }
}
```

---

**آخر تحديث:** 16 يناير 2026  
**المُعِد:** GitHub Copilot AI Assistant

---
