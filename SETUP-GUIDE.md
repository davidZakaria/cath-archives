# Setup Guide - Arabic Digital Archives

This guide will help you set up and run the Arabic Digital Archives OCR & Review System.

## Quick Start

### 1. Install Dependencies

```bash
cd arabic-archives-app
npm install
```

### 2. Set Up MongoDB

You have two options:

#### Option A: Local MongoDB (Recommended for Development)

1. Install MongoDB Community Edition:
   - **Windows**: Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - **Mac**: `brew install mongodb-community`
   - **Linux**: Follow [official docs](https://docs.mongodb.com/manual/administration/install-on-linux/)

2. Start MongoDB:
   ```bash
   # Windows (run as service)
   net start MongoDB
   
   # Mac/Linux
   brew services start mongodb-community  # Mac
   sudo systemctl start mongod            # Linux
   ```

3. Verify it's running:
   ```bash
   mongosh
   # Should connect successfully
   ```

#### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string (looks like: `mongodb+srv://...`)

### 3. Set Up Google Cloud Vision API

The system uses Google's Vision API for OCR. Here's how to set it up:

#### Step 1: Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. **Important**: Enable billing (required for Vision API, but includes $300 free credits)

#### Step 2: Enable Vision API

1. In the Google Cloud Console, navigate to "APIs & Services" → "Library"
2. Search for "Cloud Vision API"
3. Click "Enable"

#### Step 3: Create Credentials

**Option A: API Key (Simpler, for Development)**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. (Optional) Restrict the key to only Cloud Vision API for security

**Option B: Service Account (More Secure, for Production)**

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in the details and click "Create"
4. Grant the role "Cloud Vision API User"
5. Click "Done"
6. Click on the created service account
7. Go to "Keys" tab → "Add Key" → "Create New Key" → "JSON"
8. Download the JSON file and save it securely

### 4. Configure Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in your values:

   ```env
   # MongoDB - choose one:
   MONGODB_URI=mongodb://localhost:27017/arabic-archives
   # OR for Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arabic-archives

   # Google Cloud Vision - choose one:
   # Option A: API Key
   GOOGLE_CLOUD_VISION_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   
   # Option B: Service Account
   # GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
   # GOOGLE_CLOUD_PROJECT_ID=your-project-id

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the System

### 1. Test Upload

1. Go to the home page
2. Drag and drop a manuscript image (or click to browse)
3. The file should upload and show progress
4. You'll be redirected to the Review Queue

### 2. Test OCR

1. After uploading, wait a few seconds for OCR to process
2. The document should appear in the Review Queue
3. Check the "OCR Confidence" score

### 3. Test Manual Review

1. Click on a document in the Review Queue
2. You should see:
   - Left side: Zoomable image of the manuscript
   - Right side: Editable text (OCR results pre-filled)
3. Try these features:
   - Scroll mouse wheel to zoom image
   - Click and drag to pan the image
   - Edit the text on the right
   - Press `Ctrl+S` to save draft
   - Click "Complete Review" when done

### 4. Test Dashboard

1. Go to the Dashboard
2. You should see metrics about your documents:
   - Total documents
   - Review status breakdown
   - Average OCR confidence
   - Average review time
   - Throughput estimates

## Troubleshooting

### "Failed to connect to MongoDB"

**Solution:**
- Verify MongoDB is running: `mongosh` (for local) or check Atlas dashboard (for cloud)
- Check your `MONGODB_URI` in `.env.local`
- For Atlas: Ensure your IP is whitelisted

### "OCR processing failed"

**Solutions:**
1. Verify Google Cloud Vision API is enabled in your project
2. Check that billing is enabled (required for Vision API)
3. Verify your credentials:
   - For API key: Check `GOOGLE_CLOUD_VISION_API_KEY` is correct
   - For service account: Check the JSON file path in `GOOGLE_APPLICATION_CREDENTIALS`
4. Check API quotas (free tier: 1,000 requests/month)

### "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Upload fails silently

**Solutions:**
1. Check file size (default limit: 10MB)
2. Verify `public/uploads/` directory exists
3. Check browser console for error messages
4. Ensure file is an image format (JPG, PNG, etc.)

### Text not displaying in RTL (right-to-left)

**Solution:**
- Arabic font should load automatically
- Check browser console for font loading errors
- Clear browser cache and refresh

## System Requirements

### Minimum Requirements
- Node.js 18.x or higher
- 4GB RAM
- 1GB free disk space (for uploads)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Recommended Requirements
- Node.js 20.x
- 8GB RAM
- 10GB free disk space
- Google Cloud account with billing enabled
- MongoDB Atlas free tier or local MongoDB

## Cost Estimates

### Google Cloud Vision API
- **Free tier**: 1,000 requests/month
- **After free tier**: $1.50 per 1,000 images
- **For 10,000 documents**: ~$15

### MongoDB Atlas (if using cloud)
- **Free tier (M0)**: 512MB storage, good for ~1,000 documents
- **Shared tier (M2)**: $9/month, 2GB storage
- **Dedicated (M10)**: $57/month, 10GB storage

### Vercel Hosting (if deploying)
- **Hobby tier**: Free for personal projects
- **Pro tier**: $20/month for production apps

## Next Steps

Once the system is running:

1. **Upload Test Documents**: Start with 5-10 sample manuscripts
2. **Evaluate OCR Quality**: Check the confidence scores and accuracy
3. **Test Review Workflow**: Time how long it takes to review each document
4. **Analyze Metrics**: Use the dashboard to assess throughput
5. **Iterate**: Adjust the workflow based on your findings

## Getting Help

### Common Issues

1. **OCR accuracy is low**
   - Try improving image quality (scan at higher DPI)
   - Ensure good lighting and contrast
   - Clean the manuscript before scanning

2. **Review takes too long**
   - Use keyboard shortcuts (`Ctrl+S`, `Ctrl+Enter`)
   - Work in batches
   - Take breaks to maintain accuracy

3. **Need more features**
   - Translation system
   - User authentication
   - Public search interface
   - Batch processing
   
   These can be added after validating the core OCR + Review workflow.

## Production Deployment

When you're ready to deploy:

1. **Hosting**: Use Vercel (easiest for Next.js)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Database**: Upgrade to MongoDB Atlas paid tier for production
3. **Storage**: Move to AWS S3 or similar for scalability
4. **Domain**: Point a custom domain to your Vercel deployment
5. **Monitoring**: Set up error tracking (Sentry) and analytics

## Support

For issues or questions:
- Check the main README.md
- Review the troubleshooting section above
- Examine browser console and server logs
- Check MongoDB logs for database issues

## Security Notes

⚠️ **Important for Production:**

1. Never commit `.env.local` or API keys to git
2. Use service account credentials (not API keys) in production
3. Restrict API keys to specific APIs and IP addresses
4. Set up proper authentication before going public
5. Regularly rotate credentials
6. Use HTTPS in production
7. Set up database user permissions properly

---

**Happy Archiving! 📚✨**

