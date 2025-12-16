# System Architecture

## Overview

The Arabic Digital Archives system is a full-stack web application built with Next.js 14, designed to digitize historical Arabic manuscripts through OCR and manual human review.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  (Next.js 14 App Router + React + TypeScript + TailwindCSS)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Upload     │  │   Review     │  │  Dashboard   │        │
│  │   Page       │  │   Interface  │  │   Metrics    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  Components:                                                    │
│  • UploadZone  • ImageViewer  • TextEditor  • MetricsCard     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│                  (Next.js API Routes)                           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   /upload   │  │ /documents  │  │  /metrics   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   MongoDB   │  │   Google    │  │    File     │
│  Database   │  │   Cloud     │  │   Storage   │
│             │  │   Vision    │  │  (uploads)  │
│  Documents  │  │   API OCR   │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **Fonts**: Noto Naskh Arabic (for RTL text support)

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database ORM**: Mongoose
- **Image Processing**: Sharp

### External Services
- **OCR**: Google Cloud Vision API
- **Database**: MongoDB (local or Atlas)
- **Storage**: Local filesystem (public/uploads/)

## Data Flow

### 1. Document Upload Flow

```
User selects file
    ↓
UploadZone component
    ↓
POST /api/upload
    ↓
├─ Save file to public/uploads/
├─ Extract image metadata (Sharp)
├─ Create document record in MongoDB
└─ Trigger OCR processing (async)
    ↓
Google Cloud Vision API
    ↓
├─ Extract Arabic text
├─ Get confidence scores
└─ Identify text blocks with coordinates
    ↓
Update document in MongoDB
    ↓
Document ready for review
```

### 2. Review Flow

```
User opens review interface
    ↓
GET /api/documents/:id
    ↓
Retrieve document from MongoDB
    ↓
ReviewInterface component renders
    ↓
├─ ImageViewer: Display manuscript
│   └─ Highlight low-confidence areas
│
└─ TextEditor: Display OCR text
    └─ User makes corrections
        ↓
    Auto-save every 30 seconds
        ↓
    PATCH /api/documents/:id
        ↓
    Update MongoDB
        ↓
    User clicks "Complete Review"
        ↓
    Final update with status = "completed"
```

### 3. Metrics Flow

```
User opens dashboard
    ↓
GET /api/metrics
    ↓
MongoDB aggregation queries
    ↓
├─ Count documents by status
├─ Calculate average OCR confidence
├─ Calculate average review time
└─ Calculate average corrections
    ↓
Return metrics
    ↓
Display in MetricsCard components
```

## Component Architecture

### Pages

#### `/` (Home/Upload)
- **Purpose**: Upload interface
- **Components**: UploadZone
- **API Calls**: POST /api/upload

#### `/review` (Review Queue)
- **Purpose**: List all documents with filters
- **Data**: GET /api/documents?status=...
- **Features**: Status filtering, thumbnails, metadata

#### `/review/[id]` (Review Detail)
- **Purpose**: Manual review interface
- **Components**: ReviewInterface, ImageViewer, TextEditor
- **API Calls**: GET /api/documents/:id, PATCH /api/documents/:id

#### `/dashboard` (Metrics)
- **Purpose**: System statistics
- **Components**: MetricsCard
- **API Calls**: GET /api/metrics

### Components

#### UploadZone
- Drag-and-drop file upload
- Multi-file support
- Progress tracking
- File validation

#### ImageViewer
- Zoomable/pannable image display
- Low-confidence area highlighting
- Mouse wheel zoom
- Click-and-drag pan

#### TextEditor
- RTL (right-to-left) text support
- Arabic font rendering
- Auto-save functionality
- Correction tracking
- Original OCR text toggle

#### ReviewInterface
- Side-by-side layout
- Timer for review time tracking
- Keyboard shortcuts (Ctrl+S, Ctrl+Enter)
- Status management (pending → in_progress → completed)

#### MetricsCard
- Configurable color themes
- Title, value, subtitle display
- Used in dashboard grid

## Database Schema

### Document Model

```typescript
{
  _id: ObjectId,                    // Auto-generated
  filename: String,                 // Original filename
  imagePath: String,                // Path to uploaded image
  imageMetadata: {
    width: Number,                  // Image dimensions
    height: Number,
    size: Number,                   // File size in bytes
    format: String,                 // Image format (jpg, png, etc.)
  },
  
  // OCR Results
  ocrText: String,                  // Full extracted text
  ocrConfidence: Number,            // 0-1 confidence score
  ocrBlocks: [{                     // Detailed text blocks
    text: String,
    confidence: Number,
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  }],
  ocrProcessedAt: Date,             // When OCR completed
  
  // Manual Review
  verifiedText: String,             // Human-verified text
  reviewStatus: Enum,               // 'pending', 'in_progress', 'completed'
  reviewStartedAt: Date,
  reviewCompletedAt: Date,
  reviewTimeSeconds: Number,        // Total review time
  correctionsCount: Number,         // Number of edits made
  reviewNotes: String,              // Optional reviewer notes
  
  // Timestamps
  uploadedAt: Date,
  createdAt: Date,                  // Auto-generated by Mongoose
  updatedAt: Date,                  // Auto-updated by Mongoose
}
```

### Indexes

- `reviewStatus`: For filtering documents by status
- `uploadedAt`: For sorting by upload date
- `ocrConfidence`: For filtering by confidence level

## API Endpoints

### POST /api/upload
- **Purpose**: Upload manuscript image
- **Input**: FormData with file
- **Process**:
  1. Validate file type
  2. Save to filesystem
  3. Extract metadata
  4. Create database record
  5. Trigger OCR (async)
- **Output**: Document metadata

### GET /api/documents
- **Purpose**: List all documents
- **Query Params**: `?status=pending|in_progress|completed|all`
- **Output**: Array of documents

### GET /api/documents/:id
- **Purpose**: Get single document
- **Output**: Document with full details

### PATCH /api/documents/:id
- **Purpose**: Update document
- **Input**: JSON with fields to update
- **Fields**: verifiedText, reviewStatus, reviewNotes, reviewTimeSeconds, etc.
- **Output**: Updated document

### GET /api/metrics
- **Purpose**: Get system statistics
- **Process**: MongoDB aggregation
- **Output**: ReviewMetrics object

## OCR Integration

### Google Cloud Vision API

```typescript
performOCRFromBuffer(imageBuffer: Buffer)
  ↓
Vision API Request
  ├─ image.content: base64 image
  └─ imageContext.languageHints: ['ar']
  ↓
Response Processing
  ├─ fullTextAnnotation.text → ocrText
  ├─ pages[].blocks[] → ocrBlocks
  └─ block.confidence → confidence scores
  ↓
Return OCRResult
  ├─ text: String
  ├─ confidence: Number
  └─ blocks: OCRBlock[]
```

### Features
- Arabic language hint optimization
- Block-level confidence scores
- Bounding box coordinates
- Support for handwritten text

## Security Considerations

### Current Implementation (Prototype)
- ⚠️ No authentication
- ⚠️ Open to anyone with URL
- ⚠️ No rate limiting
- ⚠️ API keys in environment variables

### Production Recommendations
- ✅ Implement NextAuth.js
- ✅ Add role-based access control (admin, reviewer, viewer)
- ✅ Rate limit API endpoints
- ✅ Use service account for Google Cloud
- ✅ Implement file size limits
- ✅ Validate and sanitize inputs
- ✅ Use HTTPS
- ✅ Implement CSRF protection
- ✅ Add request logging and monitoring

## Performance Optimizations

### Current
- MongoDB connection pooling
- Image metadata caching
- Lazy loading for images
- Auto-save throttling (30s)

### Future Enhancements
- Redis caching for frequent queries
- CDN for image delivery
- Background job queue (Bull/BullMQ)
- Database indexing optimization
- Image optimization (WebP, compression)
- Pagination for large result sets

## Scalability Considerations

### Current Limits (Prototype)
- Single server instance
- Local file storage
- No load balancing
- Suitable for: 100-1000 documents

### Scaling Strategy
1. **Small Scale (1K-10K docs)**
   - Deploy to Vercel
   - MongoDB Atlas M10 cluster
   - AWS S3 for images

2. **Medium Scale (10K-100K docs)**
   - Horizontal scaling with Vercel
   - MongoDB Atlas M30+ cluster
   - CloudFront CDN
   - Background job processing

3. **Large Scale (100K+ docs)**
   - Kubernetes deployment
   - MongoDB sharded cluster
   - Dedicated OCR processing servers
   - Microservices architecture

## Error Handling

### Upload Errors
- File type validation
- File size limits
- Storage failures
- Database connection errors

### OCR Errors
- API rate limits
- API quota exceeded
- Invalid credentials
- Network timeouts
- Fallback: Mark as failed, allow manual retry

### Review Errors
- Auto-save failures (retry automatically)
- Concurrent edit conflicts
- Database update failures

## Monitoring & Logging

### Current
- Console.log for errors
- Browser console for client errors

### Production Recommendations
- Structured logging (Winston/Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic/DataDog)
- Uptime monitoring
- API usage tracking

## Future Enhancements

1. **Authentication & Authorization**
   - User accounts
   - Role-based permissions
   - Activity logging

2. **Translation System**
   - Google Translate API
   - GPT-4 for context-aware translation
   - Multiple language support

3. **Public Search Interface**
   - Full-text search (MongoDB Atlas Search)
   - Advanced filters
   - Public document viewer

4. **Batch Processing**
   - Queue system for large uploads
   - Parallel OCR processing
   - Progress tracking

5. **Analytics**
   - Document view tracking
   - Search analytics
   - User behavior insights

6. **Export Features**
   - PDF generation
   - TEI XML export
   - IIIF compliance

---

This architecture is designed to be simple for prototyping while maintaining a clear path to production scalability.

