// Mongoose model for characters/actors/directors
import mongoose, { Schema, Model } from 'mongoose';

export type CharacterType = 'actor' | 'director' | 'producer' | 'writer' | 'other';

export interface ICharacter {
  _id: string;
  arabicName: string;
  englishName?: string;
  type: CharacterType;
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  birthDate?: string;
  deathDate?: string;
  nationality?: string;
  birthPlace?: string;
  photoImage?: string;
  movies?: mongoose.Types.ObjectId[];
  documentCount: number;
  relatedDocuments?: mongoose.Types.ObjectId[];
  
  // TMDB Integration fields
  tmdbId?: number;
  popularity?: number;
  knownForDepartment?: string;
  tmdbLastUpdated?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<ICharacter>(
  {
    arabicName: { type: String, required: true, index: true },
    englishName: { type: String, index: true },
    type: {
      type: String,
      enum: ['actor', 'director', 'producer', 'writer', 'other'],
      default: 'actor',
      index: true,
    },
    biography: { type: String },
    birthYear: { type: Number },
    deathYear: { type: Number },
    birthDate: { type: String },
    deathDate: { type: String },
    nationality: { type: String },
    birthPlace: { type: String },
    photoImage: { type: String },
    movies: [{ type: Schema.Types.ObjectId, ref: 'Movie' }],
    documentCount: { type: Number, default: 0 },
    relatedDocuments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    
    // TMDB Integration fields
    tmdbId: { type: Number },
    popularity: { type: Number },
    knownForDepartment: { type: String },
    tmdbLastUpdated: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Text index for search
CharacterSchema.index({ arabicName: 'text', englishName: 'text', biography: 'text' });

// Unique compound index to prevent duplicates
CharacterSchema.index({ arabicName: 1, type: 1 }, { unique: true, sparse: true });

// TMDB ID unique index
CharacterSchema.index({ tmdbId: 1 }, { unique: true, sparse: true });

const Character: Model<ICharacter> =
  mongoose.models.Character || mongoose.model<ICharacter>('Character', CharacterSchema);

export default Character;
