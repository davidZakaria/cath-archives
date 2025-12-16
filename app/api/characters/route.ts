// API routes for characters/actors CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Character from '@/models/Character';

// GET - List all characters with optional search/filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const nationality = searchParams.get('nationality');
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
    
    if (type) {
      query.type = type;
    }
    
    if (nationality) {
      query.nationality = nationality;
    }

    // Execute query
    const [characters, total] = await Promise.all([
      Character.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('movies', 'arabicName englishName year'),
      Character.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      characters,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + characters.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}

// POST - Create a new character
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      arabicName, 
      englishName, 
      type, 
      biography, 
      birthYear, 
      deathYear, 
      nationality, 
      photoImage,
      movies 
    } = body;

    if (!arabicName) {
      return NextResponse.json(
        { error: 'Arabic name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for existing character
    const existing = await Character.findOne({
      arabicName,
      type: type || 'actor',
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Character with this name and type already exists' },
        { status: 409 }
      );
    }

    const character = await Character.create({
      arabicName,
      englishName,
      type: type || 'actor',
      biography,
      birthYear,
      deathYear,
      nationality,
      photoImage,
      movies: movies || [],
      documentCount: 0,
    });

    return NextResponse.json({
      success: true,
      character,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create character:', error);
    return NextResponse.json(
      { error: 'Failed to create character', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
