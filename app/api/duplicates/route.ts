// API route for duplicate page detection in collections
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import Document from '@/models/Document';
import { 
  detectDuplicatePages, 
  getSuggestedRemovals, 
  groupDuplicateChains,
  PageForDetection,
} from '@/lib/duplicate-detection';

// POST - Detect duplicates in a collection
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { collectionId, thresholds } = body;

    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // Get the collection with its documents
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Get all documents in the collection
    const documents = await Document.find({ collectionId })
      .select('_id ocrText pageNumber')
      .sort({ pageNumber: 1 });

    if (documents.length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Not enough pages to check for duplicates',
        duplicates: [],
        suggestedRemovals: [],
        duplicateChains: [],
      });
    }

    // Prepare pages for detection
    const pages: PageForDetection[] = documents.map((doc, index) => ({
      documentId: doc._id.toString(),
      pageIndex: doc.pageNumber || index + 1,
      ocrText: doc.ocrText || '',
    }));

    // Detect duplicates
    const duplicates = detectDuplicatePages(pages, {
      exactThreshold: thresholds?.exact || 0.95,
      nearDuplicateThreshold: thresholds?.nearDuplicate || 0.80,
      similarThreshold: thresholds?.similar || 0.60,
    });

    // Get suggestions
    const suggestedRemovals = getSuggestedRemovals(duplicates);
    const duplicateChains = groupDuplicateChains(duplicates);

    // Add document details to duplicates
    const documentMap = new Map(
      documents.map(doc => [doc._id.toString(), doc])
    );

    const enrichedDuplicates = duplicates.map(dup => ({
      ...dup,
      page1: {
        documentId: dup.documentId1,
        pageNumber: documentMap.get(dup.documentId1)?.pageNumber || dup.pageIndex1,
      },
      page2: {
        documentId: dup.documentId2,
        pageNumber: documentMap.get(dup.documentId2)?.pageNumber || dup.pageIndex2,
      },
      similarityPercent: Math.round(dup.similarity * 100),
    }));

    return NextResponse.json({
      success: true,
      collectionId,
      totalPages: documents.length,
      duplicates: enrichedDuplicates,
      summary: {
        exactDuplicates: duplicates.filter(d => d.type === 'exact').length,
        nearDuplicates: duplicates.filter(d => d.type === 'near-duplicate').length,
        similar: duplicates.filter(d => d.type === 'similar').length,
        total: duplicates.length,
      },
      suggestedRemovals,
      duplicateChains,
    });
  } catch (error) {
    console.error('Duplicate detection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to detect duplicates', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove suggested duplicate pages
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { documentIds, collectionId } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs array is required' },
        { status: 400 }
      );
    }

    // Delete the duplicate documents
    const result = await Document.deleteMany({
      _id: { $in: documentIds },
      ...(collectionId ? { collectionId } : {}),
    });

    // If part of a collection, update the page numbers
    if (collectionId) {
      const remainingDocs = await Document.find({ collectionId })
        .sort({ pageNumber: 1 });
      
      // Re-number pages
      for (let i = 0; i < remainingDocs.length; i++) {
        await Document.findByIdAndUpdate(remainingDocs[i]._id, {
          pageNumber: i + 1,
        });
      }

      // Update collection total
      await Collection.findByIdAndUpdate(collectionId, {
        totalPages: remainingDocs.length,
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Removed ${result.deletedCount} duplicate pages`,
    });
  } catch (error) {
    console.error('Failed to remove duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to remove duplicates' },
      { status: 500 }
    );
  }
}

