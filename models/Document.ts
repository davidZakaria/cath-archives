// Mongoose Document model
import mongoose, { Schema, Model } from 'mongoose';
import { IDocument, OCRBlock, ImageMetadata } from '@/types';

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

const DocumentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    imagePath: { type: String, required: true },
    imageMetadata: { type: ImageMetadataSchema, required: true },
    
    // Batch reference
    batchId: { type: String, index: true },
    
    // Collection reference (for multi-page articles)
    collectionId: { type: String, index: true },
    
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

