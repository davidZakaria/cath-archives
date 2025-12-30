// API route to get character filmography from TMDB
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Character from '@/models/Character';
import Movie from '@/models/Movie';
import { getPersonMovieCredits, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const character = await Character.findById(id).populate('movies', 'arabicName englishName year posterImage tmdbId');
    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Start with local movies linked to this character
    const localMovies = (character.movies || []).map((movie: any) => ({
      _id: movie._id.toString(),
      arabicName: movie.arabicName,
      englishName: movie.englishName,
      year: movie.year,
      posterImage: movie.posterImage,
      tmdbId: movie.tmdbId,
      source: 'local',
    }));

    // If character has TMDB ID, fetch their filmography from TMDB
    let tmdbFilmography: any[] = [];
    
    if (character.tmdbId) {
      try {
        const credits = await getPersonMovieCredits(character.tmdbId);
        
        // Get movies they acted in
        const actingCredits = credits.cast
          .sort((a, b) => {
            // Sort by release date descending, handle missing dates
            const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
            const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 20)
          .map(movie => ({
            tmdbId: movie.id,
            arabicName: movie.original_title,
            englishName: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
            posterImage: getImageUrl(movie.poster_path, IMAGE_SIZES.poster.medium),
            character: movie.character,
            voteAverage: movie.vote_average,
            source: 'tmdb',
          }));

        // Get movies they directed
        const directingCredits = credits.crew
          .filter(c => c.job === 'Director')
          .sort((a, b) => {
            const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
            const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10)
          .map(movie => ({
            tmdbId: movie.id,
            arabicName: movie.original_title,
            englishName: movie.title,
            year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
            posterImage: getImageUrl(movie.poster_path, IMAGE_SIZES.poster.medium),
            role: 'مخرج',
            source: 'tmdb',
          }));

        tmdbFilmography = [...actingCredits, ...directingCredits];
        
        // Remove duplicates (keep unique by tmdbId)
        const seen = new Set();
        tmdbFilmography = tmdbFilmography.filter(movie => {
          if (seen.has(movie.tmdbId)) return false;
          seen.add(movie.tmdbId);
          return true;
        });

      } catch (error) {
        console.error('Failed to fetch TMDB filmography:', error);
      }
    }

    // Merge local and TMDB movies (prefer local if both exist)
    const localTmdbIds = new Set(localMovies.filter((m: any) => m.tmdbId).map((m: any) => m.tmdbId));
    const uniqueTmdbMovies = tmdbFilmography.filter(m => !localTmdbIds.has(m.tmdbId));
    
    const filmography = [...localMovies, ...uniqueTmdbMovies];

    return NextResponse.json({
      success: true,
      character: {
        _id: character._id,
        arabicName: character.arabicName,
        englishName: character.englishName,
        type: character.type,
        photoImage: character.photoImage,
        biography: character.biography,
        birthYear: character.birthYear,
        deathYear: character.deathYear,
        tmdbId: character.tmdbId,
      },
      filmography,
      totalCount: filmography.length,
    });
  } catch (error) {
    console.error('Failed to fetch character filmography:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filmography', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

