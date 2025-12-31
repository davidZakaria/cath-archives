import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { performOCRFromBuffer } from '@/lib/google-vision';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return await handleRetryOCR(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return await handleRetryOCR(request, params);
}

async function handleRetryOCR(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
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

    // Read the image file
    const filepath = join(process.cwd(), 'public', document.imagePath);
    const imageBuffer = await readFile(filepath);

    // Perform OCR using Google Cloud Vision
    console.log(`Starting Google Cloud Vision OCR for document ${id}...`);
    const ocrResult = await performOCRFromBuffer(imageBuffer, { processColumns: false });

    // Update document
    await Document.findByIdAndUpdate(id, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      ocrBlocks: ocrResult.blocks,
      ocrProcessedAt: new Date(),
      verifiedText: ocrResult.text,
    });

    console.log(`OCR completed for document ${id}`);
    console.log(`Extracted text length: ${ocrResult.text.length} characters`);
    console.log(`Confidence: ${(ocrResult.confidence * 100).toFixed(2)}%`);

    return NextResponse.json({
      success: true,
      message: 'OCR completed successfully',
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence,
      blocksCount: ocrResult.blocks.length,
    });
  } catch (error: any) {
    console.error('OCR retry failed:', error);
    return NextResponse.json(
      {
        error: 'OCR processing failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

