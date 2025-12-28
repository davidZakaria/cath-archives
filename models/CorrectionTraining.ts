import mongoose, { Schema, Document } from 'mongoose';

// Training data schema - stores all correction decisions for AI improvement
export interface ICorrectionTraining extends Document {
  // Source information
  documentId: mongoose.Types.ObjectId;
  collectionId?: mongoose.Types.ObjectId;
  
  // The original OCR text context (surrounding text for context)
  originalContext: string;
  
  // The specific correction
  originalText: string;          // What was in the original
  suggestedCorrection: string;   // What AI suggested
  finalText: string;             // What was actually used (could be manual edit)
  
  // User decision
  decision: 'approved' | 'rejected' | 'modified';
  
  // Correction metadata
  correctionType: 'ocr_error' | 'spelling' | 'formatting' | 'grammar';
  aiReason: string;              // Why AI suggested this change
  userReason?: string;           // Optional user feedback on why rejected/modified
  
  // AI model info
  aiModel: string;
  aiConfidence: number;
  
  // Position in text (for future pattern learning)
  position: {
    start: number;
    end: number;
  };
  
  // Timestamps
  createdAt: Date;
  reviewedAt: Date;
  
  // User who made the decision (for future multi-user support)
  reviewedBy?: string;
}

const CorrectionTrainingSchema = new Schema<ICorrectionTraining>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', index: true },
    
    originalContext: { type: String, required: true },
    originalText: { type: String, required: true, index: true },
    suggestedCorrection: { type: String, required: true },
    finalText: { type: String, required: true },
    
    decision: { 
      type: String, 
      enum: ['approved', 'rejected', 'modified'],
      required: true,
      index: true,
    },
    
    correctionType: {
      type: String,
      enum: ['ocr_error', 'spelling', 'formatting', 'grammar'],
      required: true,
      index: true,
    },
    
    aiReason: { type: String, required: true },
    userReason: { type: String },
    
    aiModel: { type: String, required: true },
    aiConfidence: { type: Number, required: true },
    
    position: {
      start: { type: Number, required: true },
      end: { type: Number, required: true },
    },
    
    reviewedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
CorrectionTrainingSchema.index({ originalText: 1, decision: 1 }); // Find patterns in rejected corrections
CorrectionTrainingSchema.index({ correctionType: 1, decision: 1 }); // Accuracy by type
CorrectionTrainingSchema.index({ aiModel: 1, decision: 1 }); // Model performance
CorrectionTrainingSchema.index({ createdAt: -1 }); // Recent corrections

// Static method to get accuracy metrics
CorrectionTrainingSchema.statics.getAccuracyMetrics = async function() {
  const pipeline = [
    {
      $group: {
        _id: {
          type: '$correctionType',
          decision: '$decision',
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiConfidence' },
      },
    },
    {
      $group: {
        _id: '$_id.type',
        decisions: {
          $push: {
            decision: '$_id.decision',
            count: '$count',
            avgConfidence: '$avgConfidence',
          },
        },
        total: { $sum: '$count' },
      },
    },
  ];
  
  return this.aggregate(pipeline);
};

// Static method to find common rejection patterns
CorrectionTrainingSchema.statics.getCommonRejections = async function(limit: number = 20) {
  return this.aggregate([
    { $match: { decision: 'rejected' } },
    {
      $group: {
        _id: {
          original: '$originalText',
          suggested: '$suggestedCorrection',
        },
        count: { $sum: 1 },
        reasons: { $push: '$aiReason' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Static method to find successful correction patterns
CorrectionTrainingSchema.statics.getSuccessfulPatterns = async function(limit: number = 50) {
  return this.aggregate([
    { $match: { decision: 'approved' } },
    {
      $group: {
        _id: {
          original: '$originalText',
          corrected: '$finalText',
          type: '$correctionType',
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiConfidence' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

export default mongoose.models.CorrectionTraining || 
  mongoose.model<ICorrectionTraining>('CorrectionTraining', CorrectionTrainingSchema);

