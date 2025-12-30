// API route for getting TMDB person details by ID
import { NextRequest, NextResponse } from 'next/server';
import { fetchAndConvertPerson, getPersonDetails, getPersonMovieCredits, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

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
      const [person, credits] = await Promise.all([
        getPersonDetails(tmdbId, language),
        getPersonMovieCredits(tmdbId, language),
      ]);

      return NextResponse.json({
        success: true,
        person: {
          ...person,
          profileUrl: getImageUrl(person.profile_path, IMAGE_SIZES.profile.large),
        },
        credits: {
          cast: credits.cast.slice(0, 20).map(c => ({
            id: c.id,
            title: c.title,
            character: c.character,
            releaseDate: c.release_date,
            posterUrl: getImageUrl(c.poster_path, IMAGE_SIZES.poster.small),
            voteAverage: c.vote_average,
          })),
          crew: credits.crew
            .filter(c => c.job === 'Director')
            .slice(0, 20)
            .map(c => ({
              id: c.id,
              title: c.title,
              job: c.job,
              releaseDate: c.release_date,
              posterUrl: getImageUrl(c.poster_path, IMAGE_SIZES.poster.small),
            })),
        },
      });
    }

    // Return converted local format
    const personData = await fetchAndConvertPerson(tmdbId);

    return NextResponse.json({
      success: true,
      person: personData,
    });
  } catch (error) {
    console.error('TMDB person details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

