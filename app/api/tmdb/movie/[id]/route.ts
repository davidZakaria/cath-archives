// API route for getting TMDB movie details by ID
import { NextRequest, NextResponse } from 'next/server';
import { fetchAndConvertMovie, getMovieDetails, getMovieCredits, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tmdbId = parseInt(id);

    if (isNaN(tmdbId)) {
      return NextResponse.json(
        { error: 'Invalid TMDB ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full'; // 'full' or 'raw'
    const language = searchParams.get('language') || 'ar-EG';

    if (format === 'raw') {
      // Return raw TMDB data
      const [movie, credits] = await Promise.all([
        getMovieDetails(tmdbId, language),
        getMovieCredits(tmdbId, language),
      ]);

      return NextResponse.json({
        success: true,
        movie: {
          ...movie,
          posterUrl: getImageUrl(movie.poster_path, IMAGE_SIZES.poster.large),
          backdropUrl: getImageUrl(movie.backdrop_path, IMAGE_SIZES.backdrop.large),
        },
        credits: {
          cast: credits.cast.slice(0, 20).map(c => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profileUrl: getImageUrl(c.profile_path, IMAGE_SIZES.profile.medium),
            order: c.order,
          })),
          directors: credits.crew
            .filter(c => c.job === 'Director')
            .map(c => ({
              id: c.id,
              name: c.name,
              profileUrl: getImageUrl(c.profile_path, IMAGE_SIZES.profile.medium),
            })),
        },
      });
    }

    // Return converted local format
    const movieData = await fetchAndConvertMovie(tmdbId);

    return NextResponse.json({
      success: true,
      movie: movieData,
    });
  } catch (error) {
    console.error('TMDB movie details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

