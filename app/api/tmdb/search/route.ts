// API route for searching TMDB movies
import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, convertTMDBToLocal, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1');
    const year = searchParams.get('year');
    const language = searchParams.get('language') || 'ar-EG';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const result = await searchMovies(query, {
      page,
      year: year ? parseInt(year) : undefined,
      language,
    });

    // Convert results to a simpler format for the frontend
    const movies = result.results.map(movie => ({
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
      overview: movie.overview,
      posterUrl: getImageUrl(movie.poster_path, IMAGE_SIZES.poster.medium),
      backdropUrl: getImageUrl(movie.backdrop_path, IMAGE_SIZES.backdrop.small),
      voteAverage: movie.vote_average,
      popularity: movie.popularity,
      originalLanguage: movie.original_language,
    }));

    return NextResponse.json({
      success: true,
      movies,
      pagination: {
        page: result.page,
        totalPages: result.total_pages,
        totalResults: result.total_results,
      },
    });
  } catch (error) {
    console.error('TMDB search error:', error);
    return NextResponse.json(
      { error: 'Failed to search TMDB', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

