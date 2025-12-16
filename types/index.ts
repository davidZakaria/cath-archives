// TypeScript type definitions for the application

export interface OCRBlock {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Font size detection for title/body distinction
  estimatedFontSize?: number;
  // Block type detected by size analysis
  blockType?: 'title' | 'subtitle' | 'heading' | 'body' | 'caption';
}

// Enhanced OCR result with accuracy metrics
export interface EnhancedOCRResult {
  text: string;
  formattedText: string;
  confidence: number;
  blocks: OCRBlock[];
  // Detailed accuracy metrics
  accuracyMetrics: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
}

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dialogue {
  speaker?: string;
  text: string;
}

export interface FormattedArticle {
  title?: string;
  subtitle?: string;
  body?: string;
  dialogues?: Dialogue[];
  credits?: string;
}

export interface ArticleMetadata {
  movies?: string[];
  characters?: string[];
  publicationDate?: string;
  source?: string;
}

export interface IDocument {
  _id: string;
  filename: string;
  imagePath: string;
  imageMetadata: ImageMetadata;
  
  // Batch reference
  batchId?: string;
  
  // OCR Results
  ocrText: string;
  ocrConfidence: number;
  ocrBlocks: OCRBlock[];
  ocrProcessedAt?: Date;
  
  // AI Processing Results
  aiCorrectedText?: string;
  aiProcessedAt?: Date;
  processingStatus?: 'pending' | 'ocr_processing' | 'ocr_complete' | 'ai_processing' | 'ai_complete' | 'failed';
  
  // Formatted Content (from AI)
  formattedContent?: FormattedArticle;
  
  // Metadata extracted by AI
  metadata?: ArticleMetadata;
  
  // Related entities
  relatedMovies?: string[];
  relatedCharacters?: string[];
  
  // Extracted images from this document
  extractedImages?: string[];
  
  // Manual Review
  verifiedText?: string;
  reviewStatus: 'pending' | 'in_progress' | 'completed';
  reviewStartedAt?: Date;
  reviewCompletedAt?: Date;
  reviewTimeSeconds?: number;
  correctionsCount?: number;
  reviewNotes?: string;
  
  // Metadata
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewMetrics {
  totalDocuments: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  avgOcrConfidence: number;
  avgReviewTime: number;
  avgCorrections: number;
}

// Movie entity
export interface IMovie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  genres?: string[];
  description?: string;
  directors?: string[];
  documentCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Character/Actor entity
export interface ICharacter {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: 'actor' | 'director' | 'producer' | 'writer' | 'other';
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  movies?: string[];
  documentCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extracted Image entity
export interface IExtractedImage {
  _id: string;
  parentDocumentId: string;
  imagePath: string;
  thumbnailPath?: string;
  boundingBox: BoundingBox;
  caption?: string;
  relatedMovies?: string[];
  relatedCharacters?: string[];
  createdAt: Date;
}

// Batch entity
export interface IBatch {
  _id: string;
  batchId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled';
  documents: IBatchDocument[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface IBatchDocument {
  documentId: string;
  filename: string;
  status: 'pending' | 'uploading' | 'processing_ocr' | 'processing_ai' | 'completed' | 'failed';
  error?: string;
  ocrCompletedAt?: Date;
  aiCompletedAt?: Date;
}
