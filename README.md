# Arabic Cinema Digital Archive System

A comprehensive digital archive system for preserving and browsing historical Arabic cinema magazines and newspapers. Built with Next.js, MongoDB, Google Cloud Vision OCR, and GPT-4 AI.

## Features

### Core Features
- **Batch Upload**: Upload 100+ images at once with folder support
- **Arabic OCR**: Google Cloud Vision API optimized for Arabic text
- **AI Text Correction**: GPT-4 powered correction achieving 99% accuracy
- **Embedded Image Detection**: Extract photos from scanned magazine pages
- **Manual Review Interface**: Side-by-side image/text editing with auto-save

### Archive Organization
- **Movies Database**: Organize archives by film titles
- **Characters Database**: Browse by actors, directors, and other personalities
- **Metadata Extraction**: AI extracts movies, characters, dates from articles
- **Full-Text Search**: Search across all digitized content

### Beautiful UI
- **RTL Arabic Design**: Fully right-to-left optimized interface
- **Public Archive Browser**: Grid/list views with filters
- **Article Viewer**: Original scan + formatted text side-by-side
- **Photo Gallery**: View extracted images from each document

### Infrastructure
- **Job Queue**: BullMQ + Redis for reliable background processing
- **Cloud Storage**: Optional Google Cloud Storage for 800k+ images
- **Scalable**: MongoDB indexes and efficient querying

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud account with Vision API enabled
- OpenAI API key (for GPT-4)

### Installation

```bash
# Clone and install
cd arabic-archives-app
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/arabic-archives
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
OPENAI_API_KEY=sk-your-key

# Optional
REDIS_URL=redis://localhost:6379
USE_CLOUD_STORAGE=false
```

## Usage

### 1. Upload Documents

Navigate to the home page and:
- Drag & drop images or folders
- Click "Select Images" for file picker
- Click "Select Folder" for batch upload

### 2. OCR Processing

Documents are automatically processed with:
1. Google Cloud Vision OCR (Arabic optimized)
2. AI correction with GPT-4 (optional)
3. Embedded image extraction

### 3. Manual Review

Visit `/review` to:
- See all documents with status filters
- Open side-by-side review interface
- Correct text with auto-save
- Mark documents as completed

### 4. AI Processing

Trigger AI processing via API:
```bash
# Single document
POST /api/ai-process/{documentId}

# Batch processing
POST /api/ai-process/batch
{ "processAll": true }
```

### 5. Browse Archive

Public archive at `/archive`:
- Grid/list view toggle
- Filter by status, movie, character
- Full-text search
- Beautiful article viewer

### 6. Manage Categories

Admin panel at `/admin/categories`:
- Add/edit movies
- Add/edit characters (actors, directors)
- View document counts

## API Endpoints

### Documents
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `PATCH /api/documents/:id` - Update document
- `POST /api/upload` - Upload single file
- `POST /api/batch-upload` - Upload multiple files

### AI Processing
- `POST /api/ai-process/:id` - Process single document
- `POST /api/ai-process/batch` - Batch process
- `GET /api/ai-process/batch` - Cost estimate

### Image Extraction
- `POST /api/extract-images/:id` - Extract images
- `GET /api/extract-images/:id` - Get extracted images

### Movies & Characters
- `GET/POST /api/movies` - List/create movies
- `GET/PATCH/DELETE /api/movies/:id` - Single movie
- `GET/POST /api/characters` - List/create characters
- `GET/PATCH/DELETE /api/characters/:id` - Single character

### Batch Management
- `GET /api/batch-status/:batchId` - Get batch status
- `PATCH /api/batch-status/:batchId` - Pause/resume/cancel

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  (Next.js 14 + React 19 + TypeScript + TailwindCSS)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Processing Pipeline                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Google Cloud │  │   GPT-4 AI   │  │    Image     │         │
│  │ Vision OCR   │  │   Agent      │  │  Detection   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   MongoDB   │  │   Redis     │  │   Storage   │
│  Database   │  │   Queue     │  │ (Local/GCS) │
└─────────────┘  └─────────────┘  └─────────────┘
```

## File Structure

```
arabic-archives-app/
├── app/
│   ├── api/                 # API routes
│   │   ├── ai-process/      # AI processing endpoints
│   │   ├── batch-upload/    # Batch upload endpoint
│   │   ├── batch-status/    # Batch status endpoint
│   │   ├── characters/      # Characters CRUD
│   │   ├── documents/       # Documents CRUD
│   │   ├── extract-images/  # Image extraction
│   │   ├── metrics/         # Dashboard metrics
│   │   ├── movies/          # Movies CRUD
│   │   └── upload/          # Single upload
│   ├── admin/
│   │   └── categories/      # Category management
│   ├── archive/             # Public archive browser
│   ├── characters/          # Characters browse page
│   ├── dashboard/           # Metrics dashboard
│   ├── movies/              # Movies browse page
│   ├── review/              # Review interface
│   └── page.tsx             # Home/upload page
├── components/              # React components
├── lib/
│   ├── ai-agent.ts          # GPT-4 integration
│   ├── cloud-storage.ts     # GCS utilities
│   ├── google-vision.ts     # OCR integration
│   ├── image-detection.ts   # Image extraction
│   ├── job-queue.ts         # BullMQ setup
│   └── mongodb.ts           # Database connection
├── models/
│   ├── Batch.ts             # Batch upload model
│   ├── Character.ts         # Character model
│   ├── Document.ts          # Document model
│   ├── ExtractedImage.ts    # Extracted image model
│   └── Movie.ts             # Movie model
└── types/
    └── index.ts             # TypeScript definitions
```

## Cost Estimates (at scale)

| Service | 800k Documents | Monthly |
|---------|----------------|---------|
| Google Vision OCR | ~$1,200 one-time | - |
| OpenAI GPT-4 | ~$800-1,600 one-time | - |
| MongoDB Atlas M30 | - | ~$150 |
| Google Cloud Storage | - | ~$15 |
| Redis (Upstash) | - | ~$10 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

---

**Built with ❤️ for preserving Arabic cinema heritage**
