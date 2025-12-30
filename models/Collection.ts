// Mongoose model for grouping multiple pages into a single collection/article
import mongoose, { Schema, Model } from 'mongoose';

export interface ICollectionPage {
  documentId: mongoose.Types.ObjectId;
  pageNumber: number;
  imagePath: string;
  ocrText?: string;
  aiCorrectedText?: string;
  // Accuracy metrics per page
  ocrConfidence?: number;
  detectedTitles?: string[];
}

export interface ICollection {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  pages: ICollectionPage[];
  totalPages: number;
  
  // Linked Movie or Character (primary association)
  linkedMovie?: mongoose.Types.ObjectId;
  linkedCharacter?: mongoose.Types.ObjectId;
  linkType?: 'movie' | 'character'; // Which type is linked
  
  // Publication status
  status: 'draft' | 'pending_review' | 'published';
  publishedAt?: Date;
  reviewNotes?: string;
  
  // Combined/merged content from all pages
  combinedOcrText?: string;
  combinedAiText?: string;
  combinedFormattedContent?: {
    title?: string;
    subtitle?: string;
    body?: string;
    dialogues?: Array<{ speaker?: string; text: string }>;
    credits?: string;
  };
  
  // Metadata (extracted from all pages)
  metadata?: {
    movies?: string[];
    characters?: string[];
    publicationDate?: string;
    source?: string;
  };
  
  // Related entities
  relatedMovies?: mongoose.Types.ObjectId[];
  relatedCharacters?: mongoose.Types.ObjectId[];
  
  // All extracted images from all pages
  extractedImages?: mongoose.Types.ObjectId[];
  
  // Cover image (first page or custom)
  coverImagePath?: string;
  
  // Processing status
  processingStatus: 'uploading' | 'processing_ocr' | 'processing_ai' | 'completed' | 'failed';
  ocrCompletedPages: number;
  aiCompletedPages: number;
  
  // Overall accuracy metrics
  accuracyScore?: number; // 0-100 percentage
  accuracyMetrics?: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
  
  // AI Detected Corrections (for one-by-one review)
  pendingCorrections?: Array<{
    id: string;
    type: 'ocr_error' | 'spelling' | 'formatting';
    original: string;
    corrected: string;
    reason: string;
    position: { start: number; end: number };
    confidence: number;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  pendingFormattingChanges?: Array<{
    id: string;
    type: 'title' | 'paragraph' | 'quote' | 'section_break';
    text: string;
    position: { start: number; end: number };
    suggestion: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  aiDetectionConfidence?: number;
  aiDetectionCost?: number;
  aiDetectionModelUsed?: string;
  aiDetectedAt?: Date;
  
  // AI Embedding for similarity search
  embedding?: number[];
  embeddingGeneratedAt?: Date;
  
  // Version History for digital preservation
  versions?: Array<{
    versionNumber: number;
    changes: string;
    modifiedBy?: string;
    modifiedAt: Date;
    snapshot: {
      title: string;
      combinedOcrText?: string;
      combinedAiText?: string;
    };
  }>;
  currentVersion?: number;
  
  // Dublin Core Metadata for archival standards
  dublinCore?: {
    // Core elements
    title?: string;           // Name of the resource
    creator?: string[];       // Entity responsible for making the resource
    subject?: string[];       // Topic of the resource
    description?: string;     // Account of the resource
    publisher?: string;       // Entity responsible for making resource available
    contributor?: string[];   // Entity responsible for contributions
    date?: string;            // Date associated with the resource (ISO 8601)
    type?: string;            // Nature or genre of the resource
    format?: string;          // Physical or digital format
    identifier?: string;      // Unique identifier (URI, ISBN, etc.)
    source?: string;          // Related resource from which this is derived
    language?: string;        // Language of the resource (ISO 639-1)
    relation?: string[];      // Related resources
    coverage?: string;        // Spatial or temporal coverage
    rights?: string;          // Rights information
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CollectionPageSchema = new Schema<ICollectionPage>({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
  pageNumber: { type: Number, required: true },
  imagePath: { type: String, required: true },
  ocrText: { type: String },
  aiCorrectedText: { type: String },
  ocrConfidence: { type: Number },
  detectedTitles: [{ type: String }],
});

const CollectionSchema = new Schema<ICollection>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    pages: [CollectionPageSchema],
    totalPages: { type: Number, default: 0 },
    
    // Linked Movie or Character
    linkedMovie: { type: Schema.Types.ObjectId, ref: 'Movie' },
    linkedCharacter: { type: Schema.Types.ObjectId, ref: 'Character' },
    linkType: { type: String, enum: ['movie', 'character'] },
    
    // Publication status
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    reviewNotes: { type: String },
    
    // Combined content
    combinedOcrText: { type: String },
    combinedAiText: { type: String },
    combinedFormattedContent: {
      title: { type: String },
      subtitle: { type: String },
      body: { type: String },
      dialogues: [{
        speaker: { type: String },
        text: { type: String },
      }],
      credits: { type: String },
    },
    
    // Metadata
    metadata: {
      movies: [{ type: String }],
      characters: [{ type: String }],
      publicationDate: { type: String },
      source: { type: String },
    },
    
    // Related entities
    relatedMovies: [{ type: Schema.Types.ObjectId, ref: 'Movie' }],
    relatedCharacters: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    extractedImages: [{ type: Schema.Types.ObjectId, ref: 'ExtractedImage' }],
    
    // Cover
    coverImagePath: { type: String },
    
    // Processing status
    processingStatus: {
      type: String,
      enum: ['uploading', 'processing_ocr', 'processing_ai', 'completed', 'failed'],
      default: 'uploading',
    },
    ocrCompletedPages: { type: Number, default: 0 },
    aiCompletedPages: { type: Number, default: 0 },
    
    // Overall accuracy metrics
    accuracyScore: { type: Number },
    accuracyMetrics: {
      overallConfidence: { type: Number },
      highConfidenceBlocksPercent: { type: Number },
      lowConfidenceBlocksPercent: { type: Number },
      averageFontSize: { type: Number },
      detectedTitles: [{ type: String }],
    },
    
    // AI Detected Corrections
    pendingCorrections: [{
      id: { type: String },
      type: { type: String, enum: ['ocr_error', 'spelling', 'formatting'] },
      original: { type: String },
      corrected: { type: String },
      reason: { type: String },
      position: {
        start: { type: Number },
        end: { type: Number },
      },
      confidence: { type: Number },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    }],
    pendingFormattingChanges: [{
      id: { type: String },
      type: { type: String, enum: ['title', 'paragraph', 'quote', 'section_break'] },
      text: { type: String },
      position: {
        start: { type: Number },
        end: { type: Number },
      },
      suggestion: { type: String },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    }],
    aiDetectionConfidence: { type: Number },
    aiDetectionCost: { type: Number },
    aiDetectionModelUsed: { type: String },
    aiDetectedAt: { type: Date },
    
    // AI Embedding for similarity search
    embedding: [{ type: Number }],
    embeddingGeneratedAt: { type: Date },
    
    // Version History for digital preservation
    versions: [{
      versionNumber: { type: Number, required: true },
      changes: { type: String },
      modifiedBy: { type: String },
      modifiedAt: { type: Date, default: Date.now },
      snapshot: {
        title: { type: String },
        combinedOcrText: { type: String },
        combinedAiText: { type: String },
      },
    }],
    currentVersion: { type: Number, default: 1 },
    
    // Dublin Core Metadata for archival standards
    dublinCore: {
      title: { type: String },
      creator: [{ type: String }],
      subject: [{ type: String }],
      description: { type: String },
      publisher: { type: String },
      contributor: [{ type: String }],
      date: { type: String },
      type: { type: String },
      format: { type: String },
      identifier: { type: String },
      source: { type: String },
      language: { type: String, default: 'ar' },
      relation: [{ type: String }],
      coverage: { type: String },
      rights: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for querying
CollectionSchema.index({ processingStatus: 1 });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ linkedMovie: 1 });
CollectionSchema.index({ linkedCharacter: 1 });
CollectionSchema.index({ publishedAt: -1 });
CollectionSchema.index({ createdAt: -1 });
CollectionSchema.index({ 'metadata.movies': 1 });
CollectionSchema.index({ 'metadata.characters': 1 });

// Full-text search index for advanced search
CollectionSchema.index(
  {
    title: 'text',
    subtitle: 'text',
    description: 'text',
    combinedOcrText: 'text',
    combinedAiText: 'text',
    'combinedFormattedContent.title': 'text',
    'combinedFormattedContent.body': 'text',
    'metadata.movies': 'text',
    'metadata.characters': 'text',
    'metadata.source': 'text',
  },
  {
    weights: {
      title: 10,
      'combinedFormattedContent.title': 8,
      subtitle: 5,
      'metadata.movies': 4,
      'metadata.characters': 4,
      description: 3,
      combinedAiText: 2,
      combinedOcrText: 1,
      'combinedFormattedContent.body': 1,
      'metadata.source': 1,
    },
    name: 'collection_text_search',
    default_language: 'arabic',
  }
);

const Collection: Model<ICollection> =
  mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema);

export default Collection;
