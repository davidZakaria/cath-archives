// API route for verifying historical accuracy with minimal cost
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { verifyHistoricalAccuracy, AIModel, AI_MODELS } from '@/lib/ai-agent';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse request body for model selection (defaults to gpt-4o-mini for minimal cost)
    let model: AIModel = 'gpt-4o-mini';
    try {
      const body = await request.json();
      if (body.model && AI_MODELS[body.model as AIModel]) {
        model = body.model as AIModel;
      }
    } catch {
      // No body or invalid JSON - use default model
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the document
    const document = await Document.findById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Use verified text if available, otherwise OCR text
    const textToVerify = document.verifiedText || document.aiCorrectedText || document.ocrText;

    if (!textToVerify || textToVerify.trim() === '') {
      return NextResponse.json(
        { error: 'Document has no text to verify' },
        { status: 400 }
      );
    }

    // Verify historical accuracy
    const result = await verifyHistoricalAccuracy(textToVerify, { model });

    // Update document with verification results if corrections were made
    if (result.corrections.length > 0) {
      await Document.findByIdAndUpdate(id, {
        $set: {
          'metadata.verificationResult': {
            isAccurate: result.isAccurate,
            confidence: result.confidence,
            correctionsCount: result.corrections.length,
            verifiedAt: new Date(),
            modelUsed: model,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      documentId: id,
      isAccurate: result.isAccurate,
      correctedText: result.correctedText,
      corrections: result.corrections,
      confidence: result.confidence,
      cost: result.cost,
      modelUsed: model,
    });
  } catch (error) {
    console.error('Historical verification error:', error);
    return NextResponse.json(
      { 
        error: 'Historical verification failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to verify accuracy of raw text (without document)
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
      'metadata.verificationResult verifiedText aiCorrectedText ocrText'
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
      hasVerificationResult: !!document.metadata?.verificationResult,
      verificationResult: document.metadata?.verificationResult || null,
      hasText: !!(document.verifiedText || document.aiCorrectedText || document.ocrText),
    });
  } catch (error) {
    console.error('Failed to get verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
