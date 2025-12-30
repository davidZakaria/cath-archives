// API route for finding related collections using AI embeddings
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import { findRelatedCollections, generateCollectionEmbedding, createEmbeddingText } from '@/lib/embeddings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);
    const regenerate = searchParams.get('regenerate') === 'true';

    await connectDB();

    // Get the collection
    const collection = await Collection.findById(id).select(
      'title subtitle description combinedOcrText combinedAiText metadata embedding embeddingGeneratedAt status'
    );

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Generate embedding if it doesn't exist or regenerate is requested
    if (!collection.embedding?.length || regenerate) {
      console.log(`[Embeddings] Generating embedding for collection ${id}...`);
      
      try {
        await generateCollectionEmbedding(id, {
          title: collection.title,
          subtitle: collection.subtitle,
          description: collection.description,
          combinedOcrText: collection.combinedOcrText,
          combinedAiText: collection.combinedAiText,
          metadata: collection.metadata,
        });
        console.log(`[Embeddings] Successfully generated embedding for ${id}`);
      } catch (error) {
        console.error(`[Embeddings] Failed to generate embedding:`, error);
        return NextResponse.json(
          { error: 'Failed to generate embedding', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Find related collections
    const related = await findRelatedCollections(id, limit);

    // Fetch full data for related collections
    const relatedIds = related.map(r => r._id);
    const relatedCollections = await Collection.find({
      _id: { $in: relatedIds },
    })
      .select('title subtitle coverImagePath totalPages linkedMovie linkedCharacter linkType publishedAt')
      .populate('linkedMovie', 'arabicName englishName year posterImage')
      .populate('linkedCharacter', 'arabicName englishName photoImage');

    // Merge similarity scores with collection data
    const results = related.map(r => {
      const fullData = relatedCollections.find(c => c._id.toString() === r._id);
      return {
        ...fullData?.toObject(),
        similarity: r.similarity,
        similarityPercent: Math.round(r.similarity * 100),
      };
    });

    return NextResponse.json({
      success: true,
      sourceCollection: {
        _id: collection._id,
        title: collection.title,
        hasEmbedding: true,
        embeddingGeneratedAt: collection.embeddingGeneratedAt,
      },
      related: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Failed to find related collections:', error);
    return NextResponse.json(
      { error: 'Failed to find related collections', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST endpoint to regenerate embeddings for a collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const collection = await Collection.findById(id).select(
      'title subtitle description combinedOcrText combinedAiText metadata'
    );

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    console.log(`[Embeddings] Regenerating embedding for collection ${id}...`);
    
    const embedding = await generateCollectionEmbedding(id, {
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      combinedOcrText: collection.combinedOcrText,
      combinedAiText: collection.combinedAiText,
      metadata: collection.metadata,
    });

    return NextResponse.json({
      success: true,
      message: 'Embedding regenerated successfully',
      embeddingLength: embedding.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to regenerate embedding:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate embedding', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

