// API routes for individual movie operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';
import mongoose from 'mongoose';
import { fetchAndConvertMovie } from '@/lib/tmdb';

// GET - Get a single movie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const movie = await Movie.findById(id)
      .populate('actors', 'arabicName englishName type photoImage')
      .populate('relatedDocuments', 'filename imagePath formattedContent');

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      movie,
    });
  } catch (error) {
    console.error('Failed to fetch movie:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie' },
      { status: 500 }
    );
  }
}

// PATCH - Update a movie (with optional TMDB refresh)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { refreshTmdb, linkTmdbId, ...updateData } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the existing movie
    const existingMovie = await Movie.findById(id);
    if (!existingMovie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Link to a new TMDB ID
    if (linkTmdbId) {
      try {
        const tmdbData = await fetchAndConvertMovie(linkTmdbId);
        
        const movie = await Movie.findByIdAndUpdate(
          id,
          {
            $set: {
              tmdbId: tmdbData.tmdbId,
              englishName: tmdbData.englishName || existingMovie.englishName,
              description: tmdbData.description || existingMovie.description,
              genres: tmdbData.genres.length > 0 ? tmdbData.genres : existingMovie.genres,
              directors: tmdbData.directors.length > 0 ? tmdbData.directors : existingMovie.directors,
              posterImage: tmdbData.posterImage || existingMovie.posterImage,
              backdropImage: tmdbData.backdropImage,
              originalLanguage: tmdbData.originalLanguage,
              popularity: tmdbData.popularity,
              voteAverage: tmdbData.voteAverage,
              voteCount: tmdbData.voteCount,
              runtime: tmdbData.runtime,
              tagline: tmdbData.tagline,
              tmdbLastUpdated: new Date(),
            },
          },
          { new: true }
        );

        return NextResponse.json({
          success: true,
          movie,
          message: 'Movie linked to TMDB and updated',
        });
      } catch (tmdbError) {
        console.error('Failed to fetch TMDB data:', tmdbError);
        return NextResponse.json(
          { error: 'Failed to fetch TMDB data', details: tmdbError instanceof Error ? tmdbError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Refresh from existing TMDB link
    if (refreshTmdb && existingMovie.tmdbId) {
      try {
        const tmdbData = await fetchAndConvertMovie(existingMovie.tmdbId);
        
        const movie = await Movie.findByIdAndUpdate(
          id,
          {
            $set: {
              englishName: tmdbData.englishName || existingMovie.englishName,
              description: tmdbData.description || existingMovie.description,
              genres: tmdbData.genres.length > 0 ? tmdbData.genres : existingMovie.genres,
              directors: tmdbData.directors.length > 0 ? tmdbData.directors : existingMovie.directors,
              posterImage: tmdbData.posterImage || existingMovie.posterImage,
              backdropImage: tmdbData.backdropImage,
              originalLanguage: tmdbData.originalLanguage,
              popularity: tmdbData.popularity,
              voteAverage: tmdbData.voteAverage,
              voteCount: tmdbData.voteCount,
              runtime: tmdbData.runtime,
              tagline: tmdbData.tagline,
              tmdbLastUpdated: new Date(),
            },
          },
          { new: true }
        );

        return NextResponse.json({
          success: true,
          movie,
          message: 'Movie refreshed from TMDB',
        });
      } catch (tmdbError) {
        console.error('Failed to refresh from TMDB:', tmdbError);
        return NextResponse.json(
          { error: 'Failed to refresh from TMDB', details: tmdbError instanceof Error ? tmdbError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Regular update without TMDB
    // Remove fields that shouldn't be directly updated
    const { _id, createdAt, updatedAt, ...cleanUpdateData } = updateData;

    const movie = await Movie.findByIdAndUpdate(
      id,
      { $set: cleanUpdateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      movie,
    });
  } catch (error) {
    console.error('Failed to update movie:', error);
    return NextResponse.json(
      { error: 'Failed to update movie' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a movie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const movie = await Movie.findByIdAndDelete(id);

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Movie deleted',
    });
  } catch (error) {
    console.error('Failed to delete movie:', error);
    return NextResponse.json(
      { error: 'Failed to delete movie' },
      { status: 500 }
    );
  }
}
