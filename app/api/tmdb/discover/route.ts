// API route for discovering Egyptian/Arabic movies from TMDB
import { NextRequest, NextResponse } from 'next/server';
import { discoverEgyptianMovies, discoverArabicMovies, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    const sortBy = searchParams.get('sortBy') || 'popularity.desc';
    const region = searchParams.get('region') || 'egypt'; // 'egypt' or 'arabic'
    const language = searchParams.get('language') || 'ar-EG';
    const genres = searchParams.get('genres'); // comma-separated genre IDs

    const options = {
      page,
      sortBy,
      language,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      withGenres: genres ? genres.split(',').map(g => parseInt(g)) : undefined,
    };

    const result = region === 'arabic' 
      ? await discoverArabicMovies(options)
      : await discoverEgyptianMovies(options);

    // Convert results to a simpler format
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
      genreIds: movie.genre_ids,
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
    console.error('TMDB discover error:', error);
    return NextResponse.json(
      { error: 'Failed to discover movies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

