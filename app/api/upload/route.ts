// API route for uploading documents and triggering OCR
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { performOCRFromBuffer } from '@/lib/google-vision';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();
    const imageMetadata = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length,
      format: metadata.format || 'unknown',
    };

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = join(process.cwd(), 'public', 'uploads', filename);

    // Save file to public/uploads
    await writeFile(filepath, buffer);

    const imagePath = `/uploads/${filename}`;

    // Connect to database
    await connectDB();

    // Create document record
    const document = await Document.create({
      filename: file.name,
      imagePath: imagePath,
      imageMetadata: imageMetadata,
      reviewStatus: 'pending',
      uploadedAt: new Date(),
    });

    // Perform OCR in background (don't wait for it)
    performOCR(document._id.toString(), buffer).catch((error) => {
      console.error('OCR failed:', error);
    });

    return NextResponse.json({
      success: true,
      document: {
        _id: document._id.toString(),
        filename: document.filename,
        imagePath: document.imagePath,
        reviewStatus: document.reviewStatus,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Separate function to perform OCR and update document
async function performOCR(documentId: string, imageBuffer: Buffer) {
  try {
    // Perform OCR using Google Cloud Vision
    // DISABLE column splitting - process full image and sort blocks by position
    const ocrResult = await performOCRFromBuffer(imageBuffer, {
      processColumns: false // Disable column splitting, use position-based sorting instead
    });

    // Update document with OCR results
    await connectDB();
    await Document.findByIdAndUpdate(documentId, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      ocrBlocks: ocrResult.blocks,
      ocrProcessedAt: new Date(),
      verifiedText: ocrResult.text, // Pre-fill verified text with OCR result
    });

    console.log(`OCR completed for document ${documentId}`);
  } catch (error) {
    console.error(`OCR failed for document ${documentId}:`, error);
    // Update document to indicate OCR failure
    await Document.findByIdAndUpdate(documentId, {
      ocrText: '',
      ocrConfidence: 0,
      reviewStatus: 'pending',
    });
  }
}

