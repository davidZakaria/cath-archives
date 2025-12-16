// Mongoose Batch model for tracking batch uploads
import mongoose, { Schema, Model } from 'mongoose';

export interface IBatchDocument {
  documentId: string;
  filename: string;
  status: 'pending' | 'uploading' | 'processing_ocr' | 'processing_ai' | 'completed' | 'failed';
  error?: string;
  ocrCompletedAt?: Date;
  aiCompletedAt?: Date;
}

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

const BatchDocumentSchema = new Schema<IBatchDocument>({
  documentId: { type: String, required: true },
  filename: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'uploading', 'processing_ocr', 'processing_ai', 'completed', 'failed'],
    default: 'pending',
  },
  error: { type: String },
  ocrCompletedAt: { type: Date },
  aiCompletedAt: { type: Date },
});

const BatchSchema = new Schema<IBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    totalFiles: { type: Number, required: true, default: 0 },
    completedFiles: { type: Number, default: 0 },
    failedFiles: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed', 'paused', 'cancelled'],
      default: 'uploading',
    },
    documents: [BatchDocumentSchema],
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Update batch status based on document statuses
BatchSchema.methods.updateProgress = function() {
  const completed = this.documents.filter((d: IBatchDocument) => d.status === 'completed').length;
  const failed = this.documents.filter((d: IBatchDocument) => d.status === 'failed').length;
  
  this.completedFiles = completed;
  this.failedFiles = failed;
  
  if (completed + failed === this.totalFiles) {
    this.status = failed === this.totalFiles ? 'failed' : 'completed';
    this.completedAt = new Date();
  } else if (this.status !== 'paused' && this.status !== 'cancelled') {
    this.status = 'processing';
  }
  
  return this.save();
};

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
