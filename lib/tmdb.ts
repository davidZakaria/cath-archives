// TMDB (The Movie Database) API Integration
// Documentation: https://developer.themoviedb.org/reference/getting-started

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

// Image size options
export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
};

// TMDB Response Types
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  video: boolean;
  runtime?: number;
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  production_countries?: { iso_3166_1: string; name: string }[];
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  original_name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  original_name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

// Genre ID to Arabic name mapping for common genres
const GENRE_ARABIC_NAMES: Record<number, string> = {
  28: 'أكشن',
  12: 'مغامرة',
  16: 'رسوم متحركة',
  35: 'كوميديا',
  80: 'جريمة',
  99: 'وثائقي',
  18: 'دراما',
  10751: 'عائلي',
  14: 'فانتازيا',
  36: 'تاريخي',
  27: 'رعب',
  10402: 'موسيقى',
  9648: 'غموض',
  10749: 'رومانسي',
  878: 'خيال علمي',
  10770: 'فيلم تلفزيوني',
  53: 'إثارة',
  10752: 'حرب',
  37: 'غربي',
};

// Get the API key from environment
function getAPIKey(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Make authenticated request to TMDB API
async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = getAPIKey();
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ status_message: 'Unknown error' }));
    throw new Error(`TMDB API Error: ${error.status_message || response.statusText}`);
  }

  return response.json();
}

// Build full image URL
export function getImageUrl(path: string | null, size: string = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${size}${path}`;
}

// Search for movies
export async function searchMovies(
  query: string,
  options: {
    page?: number;
    language?: string;
    region?: string;
    year?: number;
    includeAdult?: boolean;
  } = {}
): Promise<TMDBSearchResult> {
  const params: Record<string, string> = {
    query,
    page: String(options.page || 1),
    language: options.language || 'ar-EG', // Default to Arabic (Egypt)
    include_adult: String(options.includeAdult || false),
  };

  if (options.region) {
    params.region = options.region;
  }

  if (options.year) {
    params.year = String(options.year);
  }

  return tmdbFetch<TMDBSearchResult>('/search/movie', params);
}

// Get movie details by TMDB ID
export async function getMovieDetails(
  tmdbId: number,
  language: string = 'ar-EG'
): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${tmdbId}`, { language });
}

// Get movie credits (cast and crew)
export async function getMovieCredits(
  tmdbId: number,
  language: string = 'ar-EG'
): Promise<TMDBCredits> {
  return tmdbFetch<TMDBCredits>(`/movie/${tmdbId}/credits`, { language });
}

// Get list of genres
export async function getGenres(language: string = 'ar-EG'): Promise<TMDBGenre[]> {
  const response = await tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list', { language });
  return response.genres;
}

// Discover Egyptian movies
export async function discoverEgyptianMovies(
  options: {
    page?: number;
    sortBy?: string;
    yearFrom?: number;
    yearTo?: number;
    language?: string;
    withGenres?: number[];
  } = {}
): Promise<TMDBSearchResult> {
  const params: Record<string, string> = {
    page: String(options.page || 1),
    language: options.language || 'ar-EG',
    sort_by: options.sortBy || 'popularity.desc',
    with_origin_country: 'EG', // Egyptian movies
    include_adult: 'false',
  };

  if (options.yearFrom) {
    params['primary_release_date.gte'] = `${options.yearFrom}-01-01`;
  }

  if (options.yearTo) {
    params['primary_release_date.lte'] = `${options.yearTo}-12-31`;
  }

  if (options.withGenres && options.withGenres.length > 0) {
    params.with_genres = options.withGenres.join(',');
  }

  return tmdbFetch<TMDBSearchResult>('/discover/movie', params);
}

// Discover Arabic movies (broader search including all Arabic-speaking countries)
export async function discoverArabicMovies(
  options: {
    page?: number;
    sortBy?: string;
    yearFrom?: number;
    yearTo?: number;
    language?: string;
  } = {}
): Promise<TMDBSearchResult> {
  const params: Record<string, string> = {
    page: String(options.page || 1),
    language: options.language || 'ar-EG',
    sort_by: options.sortBy || 'popularity.desc',
    with_original_language: 'ar', // Arabic language movies
    include_adult: 'false',
  };

  if (options.yearFrom) {
    params['primary_release_date.gte'] = `${options.yearFrom}-01-01`;
  }

  if (options.yearTo) {
    params['primary_release_date.lte'] = `${options.yearTo}-12-31`;
  }

  return tmdbFetch<TMDBSearchResult>('/discover/movie', params);
}

// Get genre name in Arabic
export function getGenreArabicName(genreId: number): string {
  return GENRE_ARABIC_NAMES[genreId] || '';
}

// Convert TMDB movie to local movie format
export interface LocalMovieData {
  arabicName: string;
  englishName: string;
  year: number | undefined;
  genres: string[];
  description: string;
  directors: string[];
  posterImage: string | null;
  tmdbId: number;
  backdropImage: string | null;
  originalLanguage: string;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  runtime: number | undefined;
  tagline: string | undefined;
  tmdbLastUpdated: Date;
}

export async function convertTMDBToLocal(
  tmdbMovie: TMDBMovie,
  fetchCredits: boolean = true
): Promise<LocalMovieData> {
  // Determine Arabic name (use original_title if Arabic, otherwise use title)
  const isArabic = tmdbMovie.original_language === 'ar';
  const arabicName = isArabic ? tmdbMovie.original_title : tmdbMovie.title;
  const englishName = isArabic ? tmdbMovie.title : tmdbMovie.original_title;

  // Extract year from release date
  const year = tmdbMovie.release_date 
    ? parseInt(tmdbMovie.release_date.split('-')[0]) 
    : undefined;

  // Get genres - use Arabic names if available
  let genres: string[] = [];
  if (tmdbMovie.genres) {
    genres = tmdbMovie.genres.map(g => GENRE_ARABIC_NAMES[g.id] || g.name);
  } else if (tmdbMovie.genre_ids) {
    genres = tmdbMovie.genre_ids.map(id => GENRE_ARABIC_NAMES[id]).filter(Boolean);
  }

  // Get directors from credits
  let directors: string[] = [];
  if (fetchCredits) {
    try {
      const credits = await getMovieCredits(tmdbMovie.id);
      directors = credits.crew
        .filter(c => c.job === 'Director')
        .map(c => c.name);
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  }

  return {
    arabicName,
    englishName,
    year,
    genres,
    description: tmdbMovie.overview || '',
    directors,
    posterImage: getImageUrl(tmdbMovie.poster_path, IMAGE_SIZES.poster.large),
    tmdbId: tmdbMovie.id,
    backdropImage: getImageUrl(tmdbMovie.backdrop_path, IMAGE_SIZES.backdrop.large),
    originalLanguage: tmdbMovie.original_language,
    popularity: tmdbMovie.popularity,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    runtime: tmdbMovie.runtime,
    tagline: tmdbMovie.tagline,
    tmdbLastUpdated: new Date(),
  };
}

// Fetch full movie details and convert to local format
export async function fetchAndConvertMovie(tmdbId: number): Promise<LocalMovieData> {
  const movieDetails = await getMovieDetails(tmdbId);
  return convertTMDBToLocal(movieDetails, true);
}

// Search and return results in local format (for quick preview, no credits)
export async function searchAndConvert(
  query: string,
  options: {
    page?: number;
    year?: number;
  } = {}
): Promise<{ results: LocalMovieData[]; totalPages: number; totalResults: number }> {
  const searchResult = await searchMovies(query, options);
  
  const results = await Promise.all(
    searchResult.results.slice(0, 10).map(movie => convertTMDBToLocal(movie, false))
  );

  return {
    results,
    totalPages: searchResult.total_pages,
    totalResults: searchResult.total_results,
  };
}

