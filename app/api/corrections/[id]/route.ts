// API route for AI text correction detection
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Collection from '@/models/Collection';
import { detectTextCorrections } from '@/lib/ai-agent';
import mongoose from 'mongoose';

// POST - Run AI detection on document or collection text
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get text from request body
    const body = await request.json().catch(() => ({}));
    let textToAnalyze = body.text;
    let entityType: 'document' | 'collection' = 'document';
    let entity = null;

    // If no text provided, try to find document or collection
    if (!textToAnalyze) {
      // First try to find as Collection
      const collection = await Collection.findById(id);
      if (collection) {
        entityType = 'collection';
        entity = collection;
        textToAnalyze = collection.combinedAiText || collection.combinedOcrText;
      } else {
        // Try to find as Document
        const document = await Document.findById(id);
        if (document) {
          entityType = 'document';
          entity = document;
          textToAnalyze = document.verifiedText || document.ocrText;
        }
      }
    } else {
      // Text provided in body, still check if entity exists for updates
      const collection = await Collection.findById(id);
      if (collection) {
        entityType = 'collection';
        entity = collection;
      } else {
        const document = await Document.findById(id);
        if (document) {
          entityType = 'document';
          entity = document;
        }
      }
    }

    if (!textToAnalyze || textToAnalyze.trim() === '') {
      return NextResponse.json(
        { error: 'No text to analyze. Please provide text in the request body or ensure the document/collection has OCR text.' },
        { status: 400 }
      );
    }

    // Run AI detection
    const result = await detectTextCorrections(textToAnalyze, {
      model: body.model || 'gpt-4o-mini',
      confidenceThreshold: body.confidenceThreshold ?? 0.95,
    });

    // Update entity with pending corrections if found
    if (entity) {
      const updateData = {
        pendingCorrections: result.corrections,
        pendingFormattingChanges: result.formattingChanges,
        aiDetectionConfidence: result.confidence,
        aiDetectionCost: result.cost,
        aiDetectionModelUsed: result.modelUsed,
        aiDetectedAt: new Date(),
      };

      if (entityType === 'collection') {
        await Collection.findByIdAndUpdate(id, { $set: updateData });
      } else {
        await Document.findByIdAndUpdate(id, { $set: updateData });
      }
    }

    return NextResponse.json({
      success: true,
      entityId: id,
      entityType,
      corrections: result.corrections,
      formattingChanges: result.formattingChanges,
      totalCorrections: result.totalCorrections,
      confidence: result.confidence,
      cost: result.cost,
      modelUsed: result.modelUsed,
    });
  } catch (error) {
    console.error('AI detection error:', error);
    return NextResponse.json(
      { 
        error: 'AI detection failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get current corrections for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const document = await Document.findById(id).select(
      'pendingCorrections pendingFormattingChanges aiDetectionConfidence aiDetectionCost aiDetectionModelUsed aiDetectedAt'
    );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Calculate summary
    const corrections = document.pendingCorrections || [];
    const formattingChanges = document.pendingFormattingChanges || [];
    
    const summary = {
      total: corrections.length + formattingChanges.length,
      approved: corrections.filter((c: { status: string }) => c.status === 'approved').length + 
                formattingChanges.filter((f: { status: string }) => f.status === 'approved').length,
      rejected: corrections.filter((c: { status: string }) => c.status === 'rejected').length + 
                formattingChanges.filter((f: { status: string }) => f.status === 'rejected').length,
      pending: corrections.filter((c: { status: string }) => c.status === 'pending').length + 
               formattingChanges.filter((f: { status: string }) => f.status === 'pending').length,
    };

    return NextResponse.json({
      success: true,
      documentId: id,
      corrections,
      formattingChanges,
      summary,
      confidence: document.aiDetectionConfidence,
      cost: document.aiDetectionCost,
      modelUsed: document.aiDetectionModelUsed,
      detectedAt: document.aiDetectedAt,
    });
  } catch (error) {
    console.error('Failed to get corrections:', error);
    return NextResponse.json(
      { error: 'Failed to get corrections' },
      { status: 500 }
    );
  }
}

// PATCH - Update correction statuses
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { corrections, formattingChanges } = body;

    if (!corrections && !formattingChanges) {
      return NextResponse.json(
        { error: 'No corrections or formatting changes provided' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    
    if (corrections) {
      updateData.pendingCorrections = corrections;
      updateData.approvedCorrectionsCount = corrections.filter((c: { status: string }) => c.status === 'approved').length;
      updateData.rejectedCorrectionsCount = corrections.filter((c: { status: string }) => c.status === 'rejected').length;
    }
    
    if (formattingChanges) {
      updateData.pendingFormattingChanges = formattingChanges;
    }

    const document = await Document.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: id,
      corrections: document.pendingCorrections,
      formattingChanges: document.pendingFormattingChanges,
    });
  } catch (error) {
    console.error('Failed to update corrections:', error);
    return NextResponse.json(
      { error: 'Failed to update corrections' },
      { status: 500 }
    );
  }
}
