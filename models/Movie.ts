// Mongoose model for movies/films
import mongoose, { Schema, Model } from 'mongoose';

export interface IMovie {
  _id: string;
  arabicName: string;
  englishName?: string;
  year?: number;
  genres?: string[];
  description?: string;
  directors?: string[];
  actors?: mongoose.Types.ObjectId[];
  posterImage?: string;
  documentCount: number;
  relatedDocuments?: mongoose.Types.ObjectId[];
  
  // TMDB Integration fields
  tmdbId?: number;
  backdropImage?: string;
  originalLanguage?: string;
  popularity?: number;
  voteAverage?: number;
  voteCount?: number;
  runtime?: number;
  tagline?: string;
  tmdbLastUpdated?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const MovieSchema = new Schema<IMovie>(
  {
    arabicName: { type: String, required: true, index: true },
    englishName: { type: String, index: true },
    year: { type: Number, index: true },
    genres: [{ type: String }],
    description: { type: String },
    directors: [{ type: String }],
    actors: [{ type: Schema.Types.ObjectId, ref: 'Character' }],
    posterImage: { type: String },
    documentCount: { type: Number, default: 0 },
    relatedDocuments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    
    // TMDB Integration fields
    tmdbId: { type: Number, index: true, sparse: true },
    backdropImage: { type: String },
    originalLanguage: { type: String },
    popularity: { type: Number },
    voteAverage: { type: Number },
    voteCount: { type: Number },
    runtime: { type: Number },
    tagline: { type: String },
    tmdbLastUpdated: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Text index for search
MovieSchema.index({ arabicName: 'text', englishName: 'text', description: 'text' });

// Unique compound index to prevent duplicates
MovieSchema.index({ arabicName: 1, year: 1 }, { unique: true, sparse: true });

// TMDB ID unique index
MovieSchema.index({ tmdbId: 1 }, { unique: true, sparse: true });

const Movie: Model<IMovie> =
  mongoose.models.Movie || mongoose.model<IMovie>('Movie', MovieSchema);

export default Movie;
