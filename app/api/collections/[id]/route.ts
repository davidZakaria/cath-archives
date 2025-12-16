// API route for individual collection operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import Document from '@/models/Document';
// Import models to register them with Mongoose (needed for populate)
import '@/models/Movie';
import '@/models/Character';
import '@/models/ExtractedImage';
import mongoose from 'mongoose';
import { processDocumentWithAI } from '@/lib/ai-agent';

// GET - Get a single collection with all pages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid collection ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if we just need status (from polling)
    const { searchParams } = new URL(request.url);
    const statusOnly = searchParams.get('statusOnly') === 'true';

    if (statusOnly) {
      // Simple query for status polling - no populate
      const collection = await Collection.findById(id).select(
        '_id title totalPages ocrCompletedPages aiCompletedPages processingStatus status'
      );

      if (!collection) {
        return NextResponse.json(
          { error: 'Collection not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        collection,
      });
    }

    // Full query with populate for detailed view
    const collection = await Collection.findById(id)
      .populate('pages.documentId', 'filename ocrText ocrConfidence verifiedText reviewStatus')
      .populate('linkedMovie', 'arabicName englishName year')
      .populate('linkedCharacter', 'arabicName englishName type')
      .populate('relatedMovies', 'arabicName englishName year')
      .populate('relatedCharacters', 'arabicName englishName type')
      .populate('extractedImages');

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error('Failed to fetch collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

// PATCH - Update collection (title, content, process AI)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid collection ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Handle AI processing request
    if (body.processWithAI) {
      const collection = await Collection.findById(id);
      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      // Update status
      await Collection.findByIdAndUpdate(id, { processingStatus: 'processing_ai' });

      // Process combined text with AI
      try {
        const textToProcess = collection.combinedOcrText || '';
        if (textToProcess) {
          const aiResult = await processDocumentWithAI(textToProcess, id);
          
          await Collection.findByIdAndUpdate(id, {
            combinedAiText: aiResult.correctedText,
            combinedFormattedContent: aiResult.formattedContent,
            metadata: aiResult.metadata,
            processingStatus: 'completed',
            aiCompletedPages: collection.totalPages,
          });
        }
      } catch (aiError) {
        console.error('AI processing failed:', aiError);
        await Collection.findByIdAndUpdate(id, { processingStatus: 'failed' });
        throw aiError;
      }

      const updatedCollection = await Collection.findById(id);
      return NextResponse.json({ success: true, collection: updatedCollection });
    }

    // Regular update
    const { _id, createdAt, updatedAt, pages, ...updateData } = body;

    const collection = await Collection.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error('Failed to update collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

// DELETE - Delete collection and its documents
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid collection ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const collection = await Collection.findById(id);
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Delete all associated documents
    const documentIds = collection.pages.map(p => p.documentId);
    await Document.deleteMany({ _id: { $in: documentIds } });

    // Delete collection
    await Collection.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Collection and all pages deleted',
    });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
