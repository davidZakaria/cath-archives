// API routes for movies CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';

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

// POST - Create a new movie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { arabicName, englishName, year, genres, description, directors, actors, posterImage } = body;

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
