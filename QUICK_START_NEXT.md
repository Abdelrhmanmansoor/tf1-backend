# 🚀 Next Steps - Database Setup (2-5 minutes)

## ✅ Phase 1 is Complete!

Everything is ready. Now just follow these 3 simple steps:

---

## 📋 Step 1: Choose Your Setup Method

### Option A: Docker (Recommended - Easiest)
No need to install PostgreSQL, Docker handles everything

```bash
# Windows (PowerShell)
.\setup-cv-database.ps1 -Docker

# macOS/Linux (Terminal)
bash setup-cv-database.sh -docker
```

**Time**: 3-5 minutes  
**What it does**: Downloads Docker image, starts PostgreSQL, runs migrations

---

### Option B: Local PostgreSQL
Install PostgreSQL on your computer

```bash
# Windows (PowerShell)
.\setup-cv-database.ps1 -Local

# macOS/Linux (Terminal)
bash setup-cv-database.sh -local
```

**Time**: 5-10 minutes  
**What it does**: Uses existing PostgreSQL, creates database, runs migrations

---

## 🎯 Step 2: Run the Setup Script

**Copy and run ONE of these commands in your terminal:**

### Windows + Docker:
```powershell
cd c:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend
.\setup-cv-database.ps1 -Docker
```

### Windows + Local PostgreSQL:
```powershell
cd c:\Users\abdel\Desktop\SportsPlatform-BE\tf1-backend
.\setup-cv-database.ps1 -Local
```

### macOS + Docker:
```bash
cd ~/Desktop/SportsPlatform-BE/tf1-backend
bash setup-cv-database.sh -docker
```

### macOS + Local PostgreSQL:
```bash
cd ~/Desktop/SportsPlatform-BE/tf1-backend
bash setup-cv-database.sh -local
```

### Linux + Docker:
```bash
cd ~/SportsPlatform-BE/tf1-backend
bash setup-cv-database.sh -docker
```

### Linux + Local PostgreSQL:
```bash
cd ~/SportsPlatform-BE/tf1-backend
bash setup-cv-database.sh -local
```

---

## ✨ Step 3: Verify It Worked

After script finishes (3-5 minutes):

```bash
# Open Prisma Studio
npx prisma studio
```

You should see:
- ✅ Database tables listed
- ✅ Sample data visible
- ✅ Web interface at http://localhost:5555

---

## ⏱️ Time Estimate

| Step | Time |
|------|------|
| Run setup script | 3-5 min |
| Script executes migrations | Auto |
| Verify with Prisma Studio | 1 min |
| **Total** | **5-7 min** |

---

## 🎓 What the Script Does Automatically

1. ✅ Checks if PostgreSQL/Docker is ready
2. ✅ Creates database `sportsplatform_cv`
3. ✅ Updates `.env` file with connection string
4. ✅ Runs Prisma migrations
5. ✅ Tests database connection
6. ✅ Shows success message

---

## ❓ Troubleshooting

### "Docker not found"
- Install Docker Desktop: https://www.docker.com/products/docker-desktop

### "psql not found"
- Install PostgreSQL: https://www.postgresql.org/download

### "Port 5432 in use"
- Change port in `docker-compose.cv.yml` or stop other PostgreSQL

### "Connection failed"
- Check `.env` file for correct DATABASE_URL
- Ensure PostgreSQL/Docker is running

---

## 📁 After Setup Complete

Your database is ready with:
- ✅ 15 tables created
- ✅ 30+ indexes optimized
- ✅ Sample data loaded
- ✅ Everything configured

---

## 🎉 You're Done!

Once the script finishes:
- Database is running ✅
- Prisma is configured ✅
- Ready for Phase 2 ✅

### Next Phase (Template System)
Starts immediately after database setup!

---

## 📞 Need Help?

Check these files:
- `SETUP_PHASE_1_COMPLETE.md` - Full setup guide
- `PHASE_1_PROGRESS_REPORT.md` - Detailed progress
- `.env.postgres` - PostgreSQL instructions

---

## 🚀 Ready?

Pick your method above and run the command!

**Windows + Docker (Most Popular):**
```powershell
.\setup-cv-database.ps1 -Docker
```

**That's it! Script handles the rest. 🎉**
