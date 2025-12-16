// Mongoose model for extracted images from documents
import mongoose, { Schema, Model } from 'mongoose';
import { BoundingBox } from '@/types';

export interface IExtractedImage {
  _id: string;
  parentDocumentId: mongoose.Types.ObjectId;
  imagePath: string;
  thumbnailPath?: string;
  boundingBox: BoundingBox;
  caption?: string;
  width: number;
  height: number;
  relatedMovies?: mongoose.Types.ObjectId[];
  relatedCharacters?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BoundingBoxSchema = new Schema<BoundingBox>({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

const ExtractedImageSchema = new Schema<IExtractedImage>(
  {
    parentDocumentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Document', 
      required: true,
      index: true,
    },
    imagePath: { type: String, required: true },
    thumbnailPath: { type: String },
    boundingBox: { type: BoundingBoxSchema, required: true },
    caption: { type: String },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    relatedMovies: [{ type: Schema.Types.ObjectId, ref: 'Movie' }],
    relatedCharacters: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
  },
  {
    timestamps: true,
  }
);

// Index for finding images by parent document
ExtractedImageSchema.index({ parentDocumentId: 1, createdAt: -1 });

const ExtractedImage: Model<IExtractedImage> =
  mongoose.models.ExtractedImage || mongoose.model<IExtractedImage>('ExtractedImage', ExtractedImageSchema);

export default ExtractedImage;
