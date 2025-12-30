// API route to get movie cast from TMDB
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';
import { getMovieCredits, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const movie = await Movie.findById(id);
    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    // If no TMDB ID, return empty cast
    if (!movie.tmdbId) {
      return NextResponse.json({
        success: true,
        cast: [],
        crew: [],
        message: 'Movie not linked to TMDB',
      });
    }

    // Fetch credits from TMDB
    const credits = await getMovieCredits(movie.tmdbId);

    // Map cast to simpler format (top 12 cast members)
    const cast = credits.cast.slice(0, 12).map(member => ({
      tmdbId: member.id,
      name: member.name,
      character: member.character,
      profileImage: getImageUrl(member.profile_path, IMAGE_SIZES.profile.medium),
      order: member.order,
      department: member.known_for_department,
    }));

    // Get directors and writers
    const directors = credits.crew
      .filter(c => c.job === 'Director')
      .map(c => ({
        tmdbId: c.id,
        name: c.name,
        job: c.job,
        profileImage: getImageUrl(c.profile_path, IMAGE_SIZES.profile.medium),
      }));

    const writers = credits.crew
      .filter(c => c.job === 'Writer' || c.job === 'Screenplay')
      .slice(0, 4)
      .map(c => ({
        tmdbId: c.id,
        name: c.name,
        job: c.job,
        profileImage: getImageUrl(c.profile_path, IMAGE_SIZES.profile.medium),
      }));

    return NextResponse.json({
      success: true,
      cast,
      crew: {
        directors,
        writers,
      },
    });
  } catch (error) {
    console.error('Failed to fetch movie cast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cast', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

