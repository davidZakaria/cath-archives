// API route for importing movies from TMDB to local database
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';
import { fetchAndConvertMovie } from '@/lib/tmdb';

// POST - Import single or multiple movies from TMDB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbIds } = body as { tmdbIds: number[] };

    if (!tmdbIds || !Array.isArray(tmdbIds) || tmdbIds.length === 0) {
      return NextResponse.json(
        { error: 'tmdbIds array is required' },
        { status: 400 }
      );
    }

    // Limit batch size
    if (tmdbIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 movies can be imported at once' },
        { status: 400 }
      );
    }

    await connectDB();

    const results: Array<{
      tmdbId: number;
      success: boolean;
      movieId?: string;
      arabicName?: string;
      error?: string;
      skipped?: boolean;
    }> = [];

    for (const tmdbId of tmdbIds) {
      try {
        // Check if movie already exists
        const existing = await Movie.findOne({ tmdbId });
        if (existing) {
          results.push({
            tmdbId,
            success: true,
            movieId: existing._id.toString(),
            arabicName: existing.arabicName,
            skipped: true,
          });
          continue;
        }

        // Fetch movie data from TMDB
        const movieData = await fetchAndConvertMovie(tmdbId);

        // Check if movie with same Arabic name and year exists
        const existingByName = await Movie.findOne({
          arabicName: movieData.arabicName,
          year: movieData.year,
        });

        if (existingByName) {
          // Update existing movie with TMDB data
          await Movie.findByIdAndUpdate(existingByName._id, {
            tmdbId: movieData.tmdbId,
            englishName: movieData.englishName || existingByName.englishName,
            description: movieData.description || existingByName.description,
            genres: movieData.genres.length > 0 ? movieData.genres : existingByName.genres,
            directors: movieData.directors.length > 0 ? movieData.directors : existingByName.directors,
            posterImage: movieData.posterImage || existingByName.posterImage,
            backdropImage: movieData.backdropImage,
            originalLanguage: movieData.originalLanguage,
            popularity: movieData.popularity,
            voteAverage: movieData.voteAverage,
            voteCount: movieData.voteCount,
            runtime: movieData.runtime,
            tagline: movieData.tagline,
            tmdbLastUpdated: movieData.tmdbLastUpdated,
          });

          results.push({
            tmdbId,
            success: true,
            movieId: existingByName._id.toString(),
            arabicName: movieData.arabicName,
            skipped: false,
          });
          continue;
        }

        // Create new movie
        const movie = await Movie.create({
          arabicName: movieData.arabicName,
          englishName: movieData.englishName,
          year: movieData.year,
          genres: movieData.genres,
          description: movieData.description,
          directors: movieData.directors,
          posterImage: movieData.posterImage,
          tmdbId: movieData.tmdbId,
          backdropImage: movieData.backdropImage,
          originalLanguage: movieData.originalLanguage,
          popularity: movieData.popularity,
          voteAverage: movieData.voteAverage,
          voteCount: movieData.voteCount,
          runtime: movieData.runtime,
          tagline: movieData.tagline,
          tmdbLastUpdated: movieData.tmdbLastUpdated,
          documentCount: 0,
        });

        results.push({
          tmdbId,
          success: true,
          movieId: movie._id.toString(),
          arabicName: movieData.arabicName,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (error) {
        console.error(`Failed to import movie ${tmdbId}:`, error);
        results.push({
          tmdbId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} movies, ${skippedCount} skipped, ${failedCount} failed`,
      results,
      summary: {
        total: tmdbIds.length,
        imported: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error('TMDB import error:', error);
    return NextResponse.json(
      { error: 'Failed to import movies', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

