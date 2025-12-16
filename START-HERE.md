# 👋 Start Here - Arabic Digital Archives

Welcome! This is your OCR + Manual Review system for digitizing historical Arabic manuscripts.

## 🎯 What Is This?

A prototype system that:
1. **Uploads** images of Arabic manuscripts
2. **Extracts text** using Google Cloud Vision OCR
3. **Enables manual review** to achieve 100% accuracy
4. **Tracks metrics** to measure efficiency

## 📚 Documentation Guide

**Choose your path:**

### 🚀 Just Want to Get Started?
→ Read **[QUICK-START.md](./QUICK-START.md)** (10-minute checklist)

### 🔧 Need Detailed Setup Instructions?
→ Read **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** (Complete guide with troubleshooting)

### 📖 Want to Understand the System?
→ Read **[PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)** (What was built and why)

### 🏗 Need Technical Details?
→ Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** (System architecture and design)

### 💡 Want Usage Instructions?
→ Read **[README.md](./README.md)** (Features and usage guide)

## ⚡ Quick Setup (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and Google Cloud Vision API key
```

### 3. Run the App
```bash
npm run dev
```

Open http://localhost:3000 🎉

## ❓ Common Questions

### "I've never set this up before. Where do I start?"
→ Follow **QUICK-START.md** - it has a checklist format

### "Setup isn't working. What do I check?"
→ See **SETUP-GUIDE.md** troubleshooting section

### "How does the OCR work?"
→ **ARCHITECTURE.md** explains the technical details

### "What can I do with this?"
→ **PROJECT-SUMMARY.md** shows what's built and next steps

### "How do I use the review interface?"
→ **README.md** has a usage section with keyboard shortcuts

## 📋 Prerequisites

Before starting, you need:
- ✅ Node.js 18+ installed
- ✅ MongoDB (local or Atlas account)
- ✅ Google Cloud account with Vision API enabled
- ✅ 10-30 minutes for setup

## 🎓 Your Journey

```
1. Setup (10-30 min)
   ↓
2. Upload Test Documents (5 min)
   ↓
3. Review Documents (10-15 min each)
   ↓
4. Check Dashboard Metrics (2 min)
   ↓
5. Evaluate & Decide Next Steps
```

## 🆘 Need Help?

1. Check the **troubleshooting** section in SETUP-GUIDE.md
2. Review browser console (F12) for errors
3. Check terminal for server errors
4. Verify `.env.local` is configured correctly

## 🎯 Success Looks Like

- ✅ Server running at http://localhost:3000
- ✅ Can upload images
- ✅ OCR extracts Arabic text
- ✅ Can review and edit text
- ✅ Dashboard shows metrics

## 📁 Project Structure

```
arabic-archives-app/
├── START-HERE.md          ← You are here!
├── QUICK-START.md         ← 10-minute setup checklist
├── SETUP-GUIDE.md         ← Detailed setup guide
├── PROJECT-SUMMARY.md     ← What was built
├── ARCHITECTURE.md        ← Technical details
├── README.md              ← Usage guide
├── .env.example          ← Environment template
├── app/                   ← Application code
├── components/            ← UI components
└── lib/                   ← Utilities (DB, OCR)
```

## 🚀 Ready?

**Option 1: Quick Setup** (if you're comfortable with dev tools)
```bash
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

**Option 2: Guided Setup** (if this is new to you)
Open **QUICK-START.md** and follow the checklist

---

**Let's digitize history! 📜→💻**

