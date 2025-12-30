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

// ============================================
// PERSON / ACTOR / DIRECTOR FUNCTIONS
// ============================================

export interface TMDBPerson {
  id: number;
  name: string;
  original_name?: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  popularity: number;
  known_for_department: string;
  gender: number;
  adult: boolean;
  also_known_as?: string[];
  homepage?: string | null;
}

export interface TMDBPersonSearchResult {
  page: number;
  results: Array<{
    id: number;
    name: string;
    original_name?: string;
    profile_path: string | null;
    popularity: number;
    known_for_department: string;
    gender: number;
    known_for?: TMDBMovie[];
  }>;
  total_pages: number;
  total_results: number;
}

export interface TMDBPersonCredits {
  id: number;
  cast: Array<{
    id: number;
    title: string;
    original_title: string;
    character: string;
    release_date: string;
    poster_path: string | null;
    vote_average: number;
  }>;
  crew: Array<{
    id: number;
    title: string;
    original_title: string;
    job: string;
    department: string;
    release_date: string;
    poster_path: string | null;
  }>;
}

// Search for people (actors, directors, etc.)
export async function searchPeople(
  query: string,
  options: {
    page?: number;
    language?: string;
    includeAdult?: boolean;
  } = {}
): Promise<TMDBPersonSearchResult> {
  const params: Record<string, string> = {
    query,
    page: String(options.page || 1),
    language: options.language || 'ar-EG',
    include_adult: String(options.includeAdult || false),
  };

  return tmdbFetch<TMDBPersonSearchResult>('/search/person', params);
}

// Get person details by TMDB ID
export async function getPersonDetails(
  tmdbId: number,
  language: string = 'ar-EG'
): Promise<TMDBPerson> {
  return tmdbFetch<TMDBPerson>(`/person/${tmdbId}`, { language });
}

// Get person movie credits
export async function getPersonMovieCredits(
  tmdbId: number,
  language: string = 'ar-EG'
): Promise<TMDBPersonCredits> {
  return tmdbFetch<TMDBPersonCredits>(`/person/${tmdbId}/movie_credits`, { language });
}

// Get popular people
export async function getPopularPeople(
  options: {
    page?: number;
    language?: string;
  } = {}
): Promise<TMDBPersonSearchResult> {
  const params: Record<string, string> = {
    page: String(options.page || 1),
    language: options.language || 'ar-EG',
  };

  return tmdbFetch<TMDBPersonSearchResult>('/person/popular', params);
}

// Local character data format
export interface LocalCharacterData {
  arabicName: string;
  englishName: string;
  type: 'actor' | 'director' | 'producer' | 'writer' | 'other';
  biography: string;
  birthYear: number | undefined;
  deathYear: number | undefined;
  birthDate: string | undefined;
  deathDate: string | undefined;
  birthPlace: string | undefined;
  photoImage: string | null;
  tmdbId: number;
  popularity: number;
  knownForDepartment: string;
  tmdbLastUpdated: Date;
}

// Map TMDB department to local type
function mapDepartmentToType(department: string): 'actor' | 'director' | 'producer' | 'writer' | 'other' {
  const dept = department.toLowerCase();
  if (dept === 'acting') return 'actor';
  if (dept === 'directing') return 'director';
  if (dept === 'production') return 'producer';
  if (dept === 'writing') return 'writer';
  return 'other';
}

// Convert TMDB person to local character format
export function convertTMDBPersonToLocal(person: TMDBPerson): LocalCharacterData {
  // Try to find Arabic name in also_known_as
  let arabicName = person.name;
  let englishName = person.name;
  
  if (person.also_known_as && person.also_known_as.length > 0) {
    // Look for Arabic name (contains Arabic characters)
    const arabicNameFound = person.also_known_as.find(name => /[\u0600-\u06FF]/.test(name));
    if (arabicNameFound) {
      arabicName = arabicNameFound;
      englishName = person.name;
    }
  }

  // Extract years from dates
  const birthYear = person.birthday ? parseInt(person.birthday.split('-')[0]) : undefined;
  const deathYear = person.deathday ? parseInt(person.deathday.split('-')[0]) : undefined;

  return {
    arabicName,
    englishName,
    type: mapDepartmentToType(person.known_for_department),
    biography: person.biography || '',
    birthYear,
    deathYear,
    birthDate: person.birthday || undefined,
    deathDate: person.deathday || undefined,
    birthPlace: person.place_of_birth || undefined,
    photoImage: getImageUrl(person.profile_path, IMAGE_SIZES.profile.large),
    tmdbId: person.id,
    popularity: person.popularity,
    knownForDepartment: person.known_for_department,
    tmdbLastUpdated: new Date(),
  };
}

// Fetch full person details and convert to local format
export async function fetchAndConvertPerson(tmdbId: number): Promise<LocalCharacterData> {
  const personDetails = await getPersonDetails(tmdbId);
  return convertTMDBPersonToLocal(personDetails);
}

// Discover popular Egyptian actors/directors
export async function discoverEgyptianPeople(
  options: {
    page?: number;
    language?: string;
  } = {}
): Promise<TMDBPersonSearchResult> {
  // TMDB doesn't have direct country filter for people, so we search for common Egyptian names
  // or get popular people and filter. For now, we'll return popular people.
  return getPopularPeople(options);
}

// Enrich an existing character with TMDB data by searching for their name
export async function enrichCharacterWithTMDBData(
  characterId: string,
  arabicName: string,
  englishName?: string
): Promise<LocalCharacterData | null> {
  try {
    // Search for the person by name (try English first, then Arabic)
    const searchName = englishName || arabicName;
    const searchResult = await searchPeople(searchName, { page: 1 });
    
    if (searchResult.results.length === 0 && englishName && arabicName !== englishName) {
      // Try Arabic name if English didn't find anything
      const arabicResult = await searchPeople(arabicName, { page: 1 });
      if (arabicResult.results.length === 0) {
        console.log(`[TMDB] No person found for: ${searchName} or ${arabicName}`);
        return null;
      }
      searchResult.results = arabicResult.results;
    }
    
    if (searchResult.results.length === 0) {
      console.log(`[TMDB] No person found for: ${searchName}`);
      return null;
    }
    
    // Get the first matching person's full details
    const tmdbPerson = searchResult.results[0];
    const personDetails = await fetchAndConvertPerson(tmdbPerson.id);
    
    console.log(`[TMDB] Found person ${tmdbPerson.name} (ID: ${tmdbPerson.id}) for character ${arabicName}`);
    return personDetails;
  } catch (error) {
    console.error('[TMDB] Error enriching character:', error);
    return null;
  }
}

