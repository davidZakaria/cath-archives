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
  },
  {
    timestamps: true,
  }
);

// Indexes
CollectionSchema.index({ title: 'text' }); // Text search on title only
CollectionSchema.index({ processingStatus: 1 });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ linkedMovie: 1 });
CollectionSchema.index({ linkedCharacter: 1 });
CollectionSchema.index({ publishedAt: -1 });
CollectionSchema.index({ createdAt: -1 });
CollectionSchema.index({ 'metadata.movies': 1 });
CollectionSchema.index({ 'metadata.characters': 1 });

const Collection: Model<ICollection> =
  mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema);

export default Collection;
