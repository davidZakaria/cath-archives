# Google Cloud Vision API Setup Guide

Follow these steps to enable OCR for your Arabic manuscripts.

## ⏱️ Time Required: 10-15 minutes

---

## Step 1: Create Google Cloud Account (if you don't have one)

1. Go to: https://cloud.google.com/
2. Click **"Get started for free"**
3. Sign in with your Google account
4. Enter billing information
   - ✅ Don't worry! You get **$300 in free credits**
   - ✅ They won't charge you without permission
   - ✅ Vision API: First 1,000 requests/month are FREE

---

## Step 2: Create a New Project

1. Go to: https://console.cloud.google.com/
2. Click the **project dropdown** at the top (next to "Google Cloud")
3. Click **"NEW PROJECT"**
4. Enter project name: `arabic-archives` (or any name you like)
5. Click **"CREATE"**
6. Wait for the project to be created (~30 seconds)
7. Make sure the new project is selected (check the dropdown at top)

---

## Step 3: Enable Billing (Required for Vision API)

1. In Google Cloud Console, click the **☰ menu** (top-left)
2. Go to **"Billing"**
3. If prompted, link a billing account or create one
4. Confirm your payment method is added
   
   **Note:** You have $300 free credits, and Vision API is cheap:
   - First 1,000 images/month: **FREE**
   - After that: $1.50 per 1,000 images
   - For 10,000 documents: ~$15 total

---

## Step 4: Enable Cloud Vision API

1. In the **☰ menu**, go to **"APIs & Services"** → **"Library"**
2. In the search bar, type: **"Cloud Vision API"**
3. Click on **"Cloud Vision API"**
4. Click the **"ENABLE"** button
5. Wait for it to enable (~10 seconds)
6. You should see "API enabled" with a green checkmark

---

## Step 5: Create API Key

### Option A: Simple API Key (Recommended for Testing)

1. In the **☰ menu**, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. A popup will show your API key - **COPY IT!** (it looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX`)
5. Click **"CLOSE"** (don't worry, you can find it again)

### Optional: Restrict the API Key (Recommended for Security)

6. Find your new API key in the list
7. Click the **pencil icon** (Edit)
8. Under "API restrictions":
   - Select **"Restrict key"**
   - Check only **"Cloud Vision API"**
9. Click **"SAVE"**

---

## Step 6: Add API Key to Your App

Now let's add the API key to your application:

1. **Open your project folder:**
   ```
   C:\Users\David.s\chatholic archives\arabic-archives-app\
   ```

2. **Find the file:** `.env.local`

3. **Edit it** (use Notepad, VS Code, or any text editor)

4. **Find this line:**
   ```
   GOOGLE_CLOUD_VISION_API_KEY=
   ```

5. **Paste your API key after the `=`:**
   ```
   GOOGLE_CLOUD_VISION_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
   ```

6. **Save the file**

---

## Step 7: Restart Your Dev Server

The server needs to restart to pick up the new API key:

1. Go to the terminal where `npm run dev` is running
2. Press **Ctrl+C** to stop it
3. Run again: **`npm run dev`**
4. Wait for "✓ Ready in X seconds"

---

## Step 8: Test OCR!

1. **Open:** http://localhost:3000
2. **Upload a test image** (any Arabic text image)
3. **Wait 5-10 seconds** for OCR to process
4. **Go to Review Queue:** http://localhost:3000/review
5. **Click on your document**
6. **You should see:**
   - ✅ Extracted Arabic text in the text editor
   - ✅ OCR confidence score at the top
   - ✅ Low-confidence areas highlighted in yellow on the image

---

## ✅ Success Checklist

- [ ] Google Cloud account created
- [ ] New project created
- [ ] Billing enabled (with $300 free credits)
- [ ] Cloud Vision API enabled
- [ ] API key created
- [ ] API key added to `.env.local`
- [ ] Dev server restarted
- [ ] Test image uploaded
- [ ] OCR extracted text successfully

---

## 🎉 You're Done!

Your system is now fully functional with OCR capabilities!

### What to do next:

1. **Upload real manuscripts** to test OCR quality
2. **Review the extracted text** to check accuracy
3. **Check the dashboard** to see metrics
4. **Measure throughput** to plan your project

---

## 🆘 Troubleshooting

### "OCR processing failed" error

**Check these:**
1. API key is correctly pasted in `.env.local` (no spaces, no quotes)
2. Cloud Vision API is enabled in Google Cloud Console
3. Billing is enabled on your Google Cloud project
4. You restarted the dev server after adding the key
5. Check terminal for specific error messages

### "API key not valid" error

**Solutions:**
1. Verify you copied the entire key (starts with `AIza...`)
2. Check if key has restrictions that block localhost
3. Try creating a new API key without restrictions

### "Quota exceeded" error

**Solutions:**
1. You've used your free 1,000 requests
2. Check quota in Google Cloud Console: APIs & Services → Dashboard
3. Either wait for monthly reset or enable billing for paid usage

### Can't find the API key again?

1. Go to: APIs & Services → Credentials
2. Find your key in the "API Keys" section
3. Click "Show" to reveal it

---

## 💰 Cost Monitoring

To avoid surprises:

1. Go to: **Billing** → **Budgets & Alerts**
2. Click **"CREATE BUDGET"**
3. Set a budget alert (e.g., $10)
4. You'll get email alerts if you approach the limit

---

## 🔒 Security Best Practices

For production use:

1. **Restrict API key** to only Cloud Vision API
2. **Add application restrictions** (HTTP referrers or IP addresses)
3. **Use Service Account** instead of API key (more secure)
4. **Rotate keys regularly**
5. **Never commit `.env.local`** to git (it's in `.gitignore` already)

---

## 📊 Expected Costs

### Free Tier (per month):
- First 1,000 OCR requests: **$0**

### Paid Tier:
- 1,001 - 5,000,000 requests: **$1.50 per 1,000**
- 5,000,001+ requests: **$0.60 per 1,000**

### Examples:
- 100 documents: **FREE**
- 5,000 documents: **$6**
- 10,000 documents: **$13.50**
- 50,000 documents: **$73.50**

---

Need help? Check the terminal output for specific error messages, or review the main SETUP-GUIDE.md for more troubleshooting tips.

**Happy OCR-ing! 🤖📜**

