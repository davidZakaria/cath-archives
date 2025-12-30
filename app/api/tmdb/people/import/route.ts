// API route for importing people from TMDB to local database
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Character from '@/models/Character';
import { fetchAndConvertPerson } from '@/lib/tmdb';

// POST - Import single or multiple people from TMDB
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
        { error: 'Maximum 50 people can be imported at once' },
        { status: 400 }
      );
    }

    await connectDB();

    const results: Array<{
      tmdbId: number;
      success: boolean;
      characterId?: string;
      arabicName?: string;
      error?: string;
      skipped?: boolean;
    }> = [];

    for (const tmdbId of tmdbIds) {
      try {
        // Check if person already exists
        const existing = await Character.findOne({ tmdbId });
        if (existing) {
          results.push({
            tmdbId,
            success: true,
            characterId: existing._id.toString(),
            arabicName: existing.arabicName,
            skipped: true,
          });
          continue;
        }

        // Fetch person data from TMDB
        const personData = await fetchAndConvertPerson(tmdbId);

        // Check if person with same name exists
        const existingByName = await Character.findOne({
          arabicName: personData.arabicName,
          type: personData.type,
        });

        if (existingByName) {
          // Update existing character with TMDB data
          await Character.findByIdAndUpdate(existingByName._id, {
            tmdbId: personData.tmdbId,
            englishName: personData.englishName || existingByName.englishName,
            biography: personData.biography || existingByName.biography,
            birthYear: personData.birthYear || existingByName.birthYear,
            deathYear: personData.deathYear || existingByName.deathYear,
            birthDate: personData.birthDate,
            deathDate: personData.deathDate,
            birthPlace: personData.birthPlace,
            photoImage: personData.photoImage || existingByName.photoImage,
            popularity: personData.popularity,
            knownForDepartment: personData.knownForDepartment,
            tmdbLastUpdated: personData.tmdbLastUpdated,
          });

          results.push({
            tmdbId,
            success: true,
            characterId: existingByName._id.toString(),
            arabicName: personData.arabicName,
            skipped: false,
          });
          continue;
        }

        // Create new character
        const character = await Character.create({
          arabicName: personData.arabicName,
          englishName: personData.englishName,
          type: personData.type,
          biography: personData.biography,
          birthYear: personData.birthYear,
          deathYear: personData.deathYear,
          birthDate: personData.birthDate,
          deathDate: personData.deathDate,
          birthPlace: personData.birthPlace,
          photoImage: personData.photoImage,
          tmdbId: personData.tmdbId,
          popularity: personData.popularity,
          knownForDepartment: personData.knownForDepartment,
          tmdbLastUpdated: personData.tmdbLastUpdated,
          documentCount: 0,
        });

        results.push({
          tmdbId,
          success: true,
          characterId: character._id.toString(),
          arabicName: personData.arabicName,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));

      } catch (error) {
        console.error(`Failed to import person ${tmdbId}:`, error);
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
      message: `Imported ${successCount} people, ${skippedCount} skipped, ${failedCount} failed`,
      results,
      summary: {
        total: tmdbIds.length,
        imported: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error('TMDB people import error:', error);
    return NextResponse.json(
      { error: 'Failed to import people', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

