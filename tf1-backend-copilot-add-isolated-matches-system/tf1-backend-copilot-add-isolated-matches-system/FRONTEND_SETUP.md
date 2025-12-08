# 🚀 Frontend Admin Dashboard - Setup Guide

## ✅ Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── AdminLogin.jsx
│   │   └── Admin/
│   │       ├── AdminLayout.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Settings.jsx
│   │       └── Users.jsx
│   ├── services/
│   │   └── adminService.js
│   ├── styles/
│   │   ├── index.css
│   │   ├── AdminLogin.css
│   │   └── AdminLayout.css
│   ├── App.jsx
│   ├── main.jsx
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## 📋 Installation & Running

### 1️⃣ Install Dependencies
```bash
cd frontend
npm install
```

### 2️⃣ Create .env File
```bash
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_API_URL=http://localhost:3000/api/v1
```

### 3️⃣ Start Development Server
```bash
npm run dev
```

Server runs at: **http://localhost:5000**

### 4️⃣ Build for Production
```bash
npm run build
```

---

## 🔐 First Login

**Test Admin Account:**
```
Email: admin@sportx.com
Password: admin123
```

⚠️ **Replace with your actual admin account!**

---

## 📍 Routes

| Route | Page |
|-------|------|
| `/admin/login` | Login page |
| `/dashboard/admin` | Main dashboard |
| `/dashboard/admin/settings` | Settings (colors, site name) |
| `/dashboard/admin/users` | Users management |

---

## 🎯 Features Implemented

✅ **Admin Login** - JWT authentication
✅ **Dashboard** - Show stats and analytics
✅ **Settings** - Change colors, site name, features
✅ **Users Management** - Block/unblock users
✅ **Real-time** - Fetches data from backend API

---

## 🔌 Backend Connection

The frontend connects to backend at:
```
http://localhost:3000/api/v1
```

Make sure backend is running:
```bash
cd /home/runner/workspace
npm run dev
```

---

## 🎨 What Can You Do?

1. **Login** - Go to `/admin/login`
2. **View Stats** - Dashboard shows user count, articles, etc.
3. **Change Colors** - Go to Settings and pick new colors for the site
4. **Manage Users** - Block/unblock users in Users page
5. **Monitor** - View all backend analytics

---

## ⚡ Quick Commands

```bash
# Development
npm run dev          # Start dev server (port 5000)

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# All backend endpoints work:
# GET  /api/v1/admin/dashboard
# GET  /api/v1/admin/settings
# PATCH /api/v1/admin/settings
# GET  /api/v1/admin/users
# PATCH /api/v1/admin/users/:id/block
# GET  /api/v1/admin/analytics
# GET  /api/v1/admin/logs
```

---

## 🐛 Troubleshooting

**Q: "Cannot reach server"**
- Make sure backend is running on port 3000
- Check .env file has correct API_URL

**Q: "Login failed"**
- Check admin account exists in database
- Try test account: admin@sportx.com / admin123

**Q: "Colors not changing"**
- Refresh the page after saving
- Check browser console for errors

---

## 📝 Customize It

### Add New Page
```javascript
// 1. Create src/pages/Admin/NewPage.jsx
export default function NewPage() {
  return <h1>New Page</h1>;
}

// 2. Import in App.jsx
import NewPage from './pages/Admin/NewPage';

// 3. Add route
<Route path="newpage" element={<NewPage />} />
```

### Add New API Call
```javascript
// 1. Edit src/services/adminService.js
export const newFunction = async () => {
  const response = await axios.get(`${API_URL}/admin/endpoint`, {
    headers: getHeaders(),
  });
  return response.data;
};

// 2. Use in component
const data = await newFunction();
```

---

## 🚀 Deploy

When ready to deploy:

```bash
# Build
npm run build

# This creates a "dist" folder ready for deployment
# Deploy the "dist" folder to your hosting

# Popular platforms:
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - GitHub Pages: npm run build && git push
```

---

**Status:** ✅ Ready to Use  
**Version:** 1.0.0  
**Last Updated:** November 24, 2025
