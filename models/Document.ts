// Mongoose Document model
import mongoose, { Schema, Model } from 'mongoose';
import { IDocument, OCRBlock, ImageMetadata, AICorrection, FormattingChange } from '@/types';

const OCRBlockSchema = new Schema<OCRBlock>({
  text: { type: String, required: true },
  confidence: { type: Number, required: true },
  boundingBox: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
});

const ImageMetadataSchema = new Schema<ImageMetadata>({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  size: { type: Number, required: true },
  format: { type: String, required: true },
});

// Schema for AI-detected corrections (for one-by-one review)
const AICorrectionSchema = new Schema<AICorrection>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['ocr_error', 'spelling', 'formatting'],
    required: true,
  },
  original: { type: String, required: true },
  corrected: { type: String, required: true },
  reason: { type: String, required: true },
  position: {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  confidence: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
});

// Schema for formatting changes
const FormattingChangeSchema = new Schema<FormattingChange>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['title', 'paragraph', 'quote', 'section_break'],
    required: true,
  },
  text: { type: String, required: true },
  position: {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  suggestion: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
});

const DocumentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    imagePath: { type: String, required: true },
    imageMetadata: { type: ImageMetadataSchema, required: true },
    
    // Batch reference
    batchId: { type: String, index: true },
    
    // Collection reference (for multi-page articles)
    collectionId: { type: String, index: true },
    pageNumber: { type: Number },
    
    // OCR Results
    ocrText: { type: String, default: '' },
    ocrConfidence: { type: Number, default: 0 },
    ocrBlocks: [OCRBlockSchema],
    ocrProcessedAt: { type: Date },
    
    // AI Processing Results
    aiCorrectedText: { type: String },
    aiProcessedAt: { type: Date },
    processingStatus: {
      type: String,
      enum: ['pending', 'ocr_processing', 'ocr_complete', 'ai_processing', 'ai_complete', 'failed'],
      default: 'pending',
    },
    
    // Formatted Content (from AI)
    formattedContent: {
      title: { type: String },
      subtitle: { type: String },
      body: { type: String },
      dialogues: [{
        speaker: { type: String },
        text: { type: String },
      }],
      credits: { type: String },
    },
    
    // Metadata extracted by AI
    metadata: {
      movies: [{ type: String }],
      characters: [{ type: String }],
      publicationDate: { type: String },
      source: { type: String },
    },
    
    // AI Detected Corrections (for one-by-one review workflow)
    pendingCorrections: [AICorrectionSchema],
    pendingFormattingChanges: [FormattingChangeSchema],
    aiDetectionConfidence: { type: Number },
    aiDetectionCost: { type: Number },
    aiDetectionModelUsed: { type: String },
    aiDetectedAt: { type: Date },
    
    // Related entities (references to Movie/Character collections)
    relatedMovies: [{ type: Schema.Types.ObjectId, ref: 'Movie' }],
    relatedCharacters: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    
    // Extracted images from this document
    extractedImages: [{ type: Schema.Types.ObjectId, ref: 'ExtractedImage' }],
    
    // Manual Review
    verifiedText: { type: String },
    reviewStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    reviewStartedAt: { type: Date },
    reviewCompletedAt: { type: Date },
    reviewTimeSeconds: { type: Number },
    correctionsCount: { type: Number, default: 0 },
    approvedCorrectionsCount: { type: Number, default: 0 },
    rejectedCorrectionsCount: { type: Number, default: 0 },
    reviewNotes: { type: String },
    
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
DocumentSchema.index({ reviewStatus: 1 });
DocumentSchema.index({ uploadedAt: -1 });
DocumentSchema.index({ ocrConfidence: 1 });

const Document: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);

export default Document;

