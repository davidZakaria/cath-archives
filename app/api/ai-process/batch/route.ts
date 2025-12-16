// API route for batch AI processing of documents
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { batchProcessDocuments, estimateProcessingCost } from '@/lib/ai-agent';

// POST - Start batch AI processing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentIds, batchId, processAll } = body;

    await connectDB();

    // Get documents to process
    let query: Record<string, unknown> = {};
    
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      query._id = { $in: documentIds };
    } else if (batchId) {
      query.batchId = batchId;
    } else if (processAll) {
      // Process all documents that have OCR but no AI processing
      query = {
        ocrText: { $exists: true, $ne: '' },
        $or: [
          { aiCorrectedText: { $exists: false } },
          { aiCorrectedText: '' },
        ],
      };
    } else {
      return NextResponse.json(
        { error: 'Provide documentIds, batchId, or set processAll to true' },
        { status: 400 }
      );
    }

    const documents = await Document.find(query).select('_id ocrText');

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found to process' },
        { status: 404 }
      );
    }

    // Estimate cost before processing
    const avgTextLength = documents.reduce((sum, doc) => sum + (doc.ocrText?.length || 0), 0) / documents.length;
    const costEstimate = estimateProcessingCost(documents.length, avgTextLength);

    // Update all documents to processing status
    await Document.updateMany(
      { _id: { $in: documents.map(d => d._id) } },
      { processingStatus: 'ai_processing' }
    );

    // Process documents in background
    const docsToProcess = documents.map(doc => ({
      id: doc._id.toString(),
      ocrText: doc.ocrText,
    }));

    // Start processing (non-blocking)
    processBatchInBackground(docsToProcess).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Batch AI processing started',
      documentsCount: documents.length,
      costEstimate,
    });
  } catch (error) {
    console.error('Batch AI processing error:', error);
    return NextResponse.json(
      { error: 'Batch AI processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processBatchInBackground(
  documents: Array<{ id: string; ocrText: string }>
) {
  const results = await batchProcessDocuments(documents, (processed, total) => {
    console.log(`AI Processing: ${processed}/${total} documents`);
  });

  // Update documents with results
  await connectDB();
  
  for (const [id, result] of results) {
    try {
      await Document.findByIdAndUpdate(id, {
        aiCorrectedText: result.correctedText,
        formattedContent: result.formattedContent,
        metadata: result.metadata,
        aiProcessedAt: new Date(),
        processingStatus: 'ai_complete',
      });
    } catch (error) {
      console.error(`Failed to save AI results for ${id}:`, error);
      await Document.findByIdAndUpdate(id, {
        processingStatus: 'failed',
      });
    }
  }

  // Mark failed documents
  const processedIds = Array.from(results.keys());
  const failedIds = documents
    .map(d => d.id)
    .filter(id => !processedIds.includes(id));

  if (failedIds.length > 0) {
    await Document.updateMany(
      { _id: { $in: failedIds } },
      { processingStatus: 'failed' }
    );
  }

  console.log(`Batch AI processing complete: ${results.size}/${documents.length} successful`);
}

// GET - Get cost estimate for processing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const count = parseInt(searchParams.get('count') || '0');

    await connectDB();

    let documentCount = count;
    let avgTextLength = 2000;

    if (batchId) {
      const documents = await Document.find({ batchId }).select('ocrText');
      documentCount = documents.length;
      avgTextLength = documents.reduce((sum, doc) => sum + (doc.ocrText?.length || 0), 0) / documentCount || 2000;
    } else if (count === 0) {
      // Count all unprocessed documents
      const documents = await Document.find({
        ocrText: { $exists: true, $ne: '' },
        $or: [
          { aiCorrectedText: { $exists: false } },
          { aiCorrectedText: '' },
        ],
      }).select('ocrText');
      
      documentCount = documents.length;
      avgTextLength = documents.reduce((sum, doc) => sum + (doc.ocrText?.length || 0), 0) / documentCount || 2000;
    }

    if (documentCount === 0) {
      return NextResponse.json({
        success: true,
        documentCount: 0,
        message: 'No documents to process',
      });
    }

    const estimate = estimateProcessingCost(documentCount, avgTextLength);

    return NextResponse.json({
      success: true,
      documentCount,
      avgTextLength: Math.round(avgTextLength),
      ...estimate,
    });
  } catch (error) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate cost' },
      { status: 500 }
    );
  }
}
