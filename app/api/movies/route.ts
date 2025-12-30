// API routes for movies CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';
import { fetchAndConvertMovie } from '@/lib/tmdb';

// GET - List all movies with optional search/filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const genre = searchParams.get('genre');
    const year = searchParams.get('year');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const sortBy = searchParams.get('sortBy') || 'arabicName';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    const hasTmdb = searchParams.get('hasTmdb'); // 'true', 'false', or null

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (genre) {
      query.genres = genre;
    }
    
    if (year) {
      query.year = parseInt(year);
    }

    // Filter by TMDB status
    if (hasTmdb === 'true') {
      query.tmdbId = { $exists: true, $ne: null };
    } else if (hasTmdb === 'false') {
      query.tmdbId = { $exists: false };
    }

    // Execute query
    const [movies, total] = await Promise.all([
      Movie.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('actors', 'arabicName englishName type'),
      Movie.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      movies,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + movies.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}

// POST - Create a new movie (with optional TMDB auto-fetch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      arabicName, 
      englishName, 
      year, 
      genres, 
      description, 
      directors, 
      actors, 
      posterImage,
      tmdbId, // If provided, auto-fetch data from TMDB
    } = body;

    // TMDB ID provided - fetch and create from TMDB data
    if (tmdbId) {
      await connectDB();

      // Check if movie with this TMDB ID already exists
      const existingTmdb = await Movie.findOne({ tmdbId });
      if (existingTmdb) {
        return NextResponse.json(
          { error: 'Movie with this TMDB ID already exists', movie: existingTmdb },
          { status: 409 }
        );
      }

      try {
        const tmdbData = await fetchAndConvertMovie(tmdbId);
        
        // Check for existing movie by name/year
        const existingByName = await Movie.findOne({
          arabicName: tmdbData.arabicName,
          ...(tmdbData.year && { year: tmdbData.year }),
        });

        if (existingByName) {
          // Update existing movie with TMDB data
          const updated = await Movie.findByIdAndUpdate(
            existingByName._id,
            {
              $set: {
                tmdbId: tmdbData.tmdbId,
                englishName: tmdbData.englishName || existingByName.englishName,
                description: tmdbData.description || existingByName.description,
                genres: tmdbData.genres.length > 0 ? tmdbData.genres : existingByName.genres,
                directors: tmdbData.directors.length > 0 ? tmdbData.directors : existingByName.directors,
                posterImage: tmdbData.posterImage || existingByName.posterImage,
                backdropImage: tmdbData.backdropImage,
                originalLanguage: tmdbData.originalLanguage,
                popularity: tmdbData.popularity,
                voteAverage: tmdbData.voteAverage,
                voteCount: tmdbData.voteCount,
                runtime: tmdbData.runtime,
                tagline: tmdbData.tagline,
                tmdbLastUpdated: tmdbData.tmdbLastUpdated,
              },
            },
            { new: true }
          );

          return NextResponse.json({
            success: true,
            movie: updated,
            message: 'Existing movie updated with TMDB data',
          });
        }

        // Create new movie from TMDB data
        const movie = await Movie.create({
          arabicName: tmdbData.arabicName,
          englishName: tmdbData.englishName,
          year: tmdbData.year,
          genres: tmdbData.genres,
          description: tmdbData.description,
          directors: tmdbData.directors,
          actors: actors || [],
          posterImage: tmdbData.posterImage,
          tmdbId: tmdbData.tmdbId,
          backdropImage: tmdbData.backdropImage,
          originalLanguage: tmdbData.originalLanguage,
          popularity: tmdbData.popularity,
          voteAverage: tmdbData.voteAverage,
          voteCount: tmdbData.voteCount,
          runtime: tmdbData.runtime,
          tagline: tmdbData.tagline,
          tmdbLastUpdated: tmdbData.tmdbLastUpdated,
          documentCount: 0,
        });

        return NextResponse.json({
          success: true,
          movie,
          message: 'Movie created from TMDB data',
        }, { status: 201 });

      } catch (tmdbError) {
        console.error('Failed to fetch TMDB data:', tmdbError);
        return NextResponse.json(
          { error: 'Failed to fetch TMDB data', details: tmdbError instanceof Error ? tmdbError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Manual creation without TMDB
    if (!arabicName) {
      return NextResponse.json(
        { error: 'Arabic name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for existing movie
    const existing = await Movie.findOne({
      arabicName,
      ...(year && { year }),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Movie with this name and year already exists' },
        { status: 409 }
      );
    }

    const movie = await Movie.create({
      arabicName,
      englishName,
      year,
      genres: genres || [],
      description,
      directors: directors || [],
      actors: actors || [],
      posterImage,
      documentCount: 0,
    });

    return NextResponse.json({
      success: true,
      movie,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create movie:', error);
    return NextResponse.json(
      { error: 'Failed to create movie', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
