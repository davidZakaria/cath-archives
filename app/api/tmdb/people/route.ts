// API route for searching TMDB people (actors, directors, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { searchPeople, getPopularPeople, getImageUrl, IMAGE_SIZES } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1');
    const language = searchParams.get('language') || 'ar-EG';
    const mode = searchParams.get('mode') || 'search'; // 'search' or 'popular'

    let result;
    
    if (mode === 'popular' || !query) {
      result = await getPopularPeople({ page, language });
    } else {
      result = await searchPeople(query, { page, language });
    }

    // Convert results to a simpler format for the frontend
    const people = result.results.map(person => ({
      tmdbId: person.id,
      name: person.name,
      profileUrl: getImageUrl(person.profile_path, IMAGE_SIZES.profile.medium),
      popularity: person.popularity,
      knownForDepartment: person.known_for_department,
      gender: person.gender,
      knownFor: person.known_for?.slice(0, 3).map(m => ({
        id: m.id,
        title: m.title,
        posterUrl: getImageUrl(m.poster_path, IMAGE_SIZES.poster.small),
      })),
    }));

    return NextResponse.json({
      success: true,
      people,
      pagination: {
        page: result.page,
        totalPages: result.total_pages,
        totalResults: result.total_results,
      },
    });
  } catch (error) {
    console.error('TMDB people search error:', error);
    return NextResponse.json(
      { error: 'Failed to search TMDB people', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

