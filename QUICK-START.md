# Quick Start Checklist

Use this checklist to get the system running in under 10 minutes.

## ✅ Checklist

### 1. Prerequisites Installed
- [ ] Node.js 18+ (`node --version`)
- [ ] npm (`npm --version`)
- [ ] MongoDB running (local or Atlas account ready)

### 2. Install Dependencies
```bash
cd arabic-archives-app
npm install
```
- [ ] Dependencies installed successfully

### 3. Set Up Environment Variables

Copy and configure:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
- [ ] MongoDB URI configured
- [ ] Google Cloud Vision API key/credentials added
- [ ] App URL set (default: http://localhost:3000)

### 4. MongoDB Setup

**Local MongoDB:**
```bash
# Start MongoDB
mongod  # or: brew services start mongodb-community
```
- [ ] MongoDB is running

**OR MongoDB Atlas:**
- [ ] Created free cluster
- [ ] Created database user
- [ ] Whitelisted IP address
- [ ] Copied connection string to `.env.local`

### 5. Google Cloud Vision API Setup

- [ ] Created/selected Google Cloud project
- [ ] Enabled billing (free $300 credits)
- [ ] Enabled Cloud Vision API
- [ ] Created credentials (API key or service account)
- [ ] Added credentials to `.env.local`

### 6. Start the Application
```bash
npm run dev
```
- [ ] Server started successfully
- [ ] No error messages
- [ ] Opened http://localhost:3000

### 7. Test Basic Functionality

**Upload Test:**
- [ ] Opened home page
- [ ] Uploaded a test image
- [ ] Redirected to Review Queue

**OCR Test:**
- [ ] Waited ~5-10 seconds
- [ ] Document shows OCR confidence score
- [ ] Can see extracted text

**Review Test:**
- [ ] Clicked on document in queue
- [ ] Can zoom/pan image (left side)
- [ ] Can edit text (right side)
- [ ] Can save draft (Ctrl+S)
- [ ] Can complete review

**Dashboard Test:**
- [ ] Opened /dashboard
- [ ] Can see metrics
- [ ] Numbers are updating correctly

## ⚡ Common Quick Fixes

### MongoDB not connecting?
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
brew services start mongodb-community  # Mac
sudo systemctl start mongod            # Linux
net start MongoDB                      # Windows (as admin)
```

### OCR not working?
1. Check Google Cloud Console:
   - Billing enabled? ✓
   - Vision API enabled? ✓
   - API key/service account valid? ✓

2. Check `.env.local`:
   ```env
   GOOGLE_CLOUD_VISION_API_KEY=your-actual-key-here
   ```

3. Restart dev server:
   ```bash
   # Stop server (Ctrl+C) and restart
   npm run dev
   ```

### Port 3000 already in use?
```bash
# Find and kill process
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Or use different port:
PORT=3001 npm run dev
```

## 🎯 Success Criteria

You're ready to go if:
- ✅ Can upload images
- ✅ OCR extracts Arabic text
- ✅ Can review and edit text
- ✅ Changes save to database
- ✅ Dashboard shows metrics

## 📚 Next Steps

1. **Upload Real Documents**: Test with actual manuscripts
2. **Evaluate Workflow**: Time the review process
3. **Check Accuracy**: Compare OCR vs manual corrections
4. **Review Metrics**: Use dashboard to optimize
5. **Plan Scale-Up**: Based on findings, plan for production

## 🆘 Still Having Issues?

1. Check `SETUP-GUIDE.md` for detailed troubleshooting
2. Check browser console (F12) for errors
3. Check terminal for server errors
4. Verify all environment variables are set correctly
5. Try deleting `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📊 Expected Performance

- **Upload Speed**: ~1-2 seconds per image
- **OCR Processing**: ~5-10 seconds per page
- **OCR Accuracy**: 60-85% (handwritten Arabic)
- **Review Time**: ~10-15 minutes per page
- **Throughput**: ~4-6 documents/hour/reviewer

---

**Ready to digitize history! 🏛️→💻**

