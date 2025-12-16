// API route for processing a document with AI
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Batch from '@/models/Batch';
import { processDocumentWithAI } from '@/lib/ai-agent';
import mongoose from 'mongoose';

export async function POST(
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

    // Get the document
    const document = await Document.findById(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if OCR text exists
    if (!document.ocrText || document.ocrText.trim() === '') {
      return NextResponse.json(
        { error: 'Document has no OCR text to process' },
        { status: 400 }
      );
    }

    // Update processing status
    await Document.findByIdAndUpdate(id, {
      processingStatus: 'ai_processing',
    });

    try {
      // Process with AI
      const result = await processDocumentWithAI(document.ocrText, id);

      // Update document with AI results
      const updatedDocument = await Document.findByIdAndUpdate(
        id,
        {
          aiCorrectedText: result.correctedText,
          formattedContent: result.formattedContent,
          metadata: result.metadata,
          aiProcessedAt: new Date(),
          processingStatus: 'ai_complete',
          // Also update verified text if not already manually edited
          ...(document.verifiedText === document.ocrText && {
            verifiedText: result.correctedText,
          }),
        },
        { new: true }
      );

      // Update batch if this document belongs to one
      if (document.batchId) {
        await Batch.findOneAndUpdate(
          { batchId: document.batchId, 'documents.documentId': id },
          {
            $set: {
              'documents.$.aiCompletedAt': new Date(),
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        document: {
          _id: updatedDocument!._id.toString(),
          aiCorrectedText: updatedDocument!.aiCorrectedText,
          formattedContent: updatedDocument!.formattedContent,
          metadata: updatedDocument!.metadata,
          processingStatus: updatedDocument!.processingStatus,
        },
        confidence: result.confidence,
      });
    } catch (aiError) {
      // Update status to failed
      await Document.findByIdAndUpdate(id, {
        processingStatus: 'failed',
      });
      throw aiError;
    }
  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json(
      { 
        error: 'AI processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check AI processing status
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
      'processingStatus aiCorrectedText formattedContent metadata aiProcessedAt'
    );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      processingStatus: document.processingStatus,
      hasAIResults: !!document.aiCorrectedText,
      aiProcessedAt: document.aiProcessedAt,
      metadata: document.metadata,
    });
  } catch (error) {
    console.error('Failed to get AI status:', error);
    return NextResponse.json(
      { error: 'Failed to get AI processing status' },
      { status: 500 }
    );
  }
}
