// API route for batch uploading documents
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Batch from '@/models/Batch';
import { performOCRFromBuffer } from '@/lib/google-vision';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Filter only image files
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid image files provided' },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = uuidv4();

    // Connect to database
    await connectDB();

    // Create batch record
    const batch = await Batch.create({
      batchId,
      totalFiles: imageFiles.length,
      completedFiles: 0,
      failedFiles: 0,
      status: 'uploading',
      documents: [],
    });

    // Process each file
    const uploadPromises = imageFiles.map(async (file, index) => {
      try {
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
        const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${index}-${safeFilename}`;
        const filepath = join(process.cwd(), 'public', 'uploads', filename);

        // Save file to public/uploads
        await writeFile(filepath, buffer);

        const imagePath = `/uploads/${filename}`;

        // Create document record
        const document = await Document.create({
          filename: file.name,
          imagePath: imagePath,
          imageMetadata: imageMetadata,
          reviewStatus: 'pending',
          uploadedAt: new Date(),
          batchId: batchId, // Link to batch
        });

        // Add document to batch
        await Batch.findOneAndUpdate(
          { batchId },
          {
            $push: {
              documents: {
                documentId: document._id.toString(),
                filename: file.name,
                status: 'processing_ocr',
              },
            },
          }
        );

        // Perform OCR in background
        processOCR(document._id.toString(), buffer, batchId).catch((error) => {
          console.error(`OCR failed for ${file.name}:`, error);
        });

        return {
          success: true,
          documentId: document._id.toString(),
          filename: file.name,
        };
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        
        // Add failed document to batch
        await Batch.findOneAndUpdate(
          { batchId },
          {
            $push: {
              documents: {
                documentId: 'failed',
                filename: file.name,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            },
            $inc: { failedFiles: 1 },
          }
        );

        return {
          success: false,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    // Update batch status to processing
    await Batch.findOneAndUpdate(
      { batchId },
      { status: 'processing' }
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      batchId,
      totalFiles: imageFiles.length,
      uploaded: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    return NextResponse.json(
      { error: 'Batch upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Separate function to perform OCR and update document + batch
async function processOCR(documentId: string, imageBuffer: Buffer, batchId: string) {
  try {
    // Perform OCR using Google Cloud Vision
    const ocrResult = await performOCRFromBuffer(imageBuffer);

    // Update document with OCR results
    await connectDB();
    await Document.findByIdAndUpdate(documentId, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      ocrBlocks: ocrResult.blocks,
      ocrProcessedAt: new Date(),
      verifiedText: ocrResult.text,
    });

    // Update batch document status
    await Batch.findOneAndUpdate(
      { batchId, 'documents.documentId': documentId },
      {
        $set: {
          'documents.$.status': 'completed',
          'documents.$.ocrCompletedAt': new Date(),
        },
        $inc: { completedFiles: 1 },
      }
    );

    // Check if batch is complete
    const batch = await Batch.findOne({ batchId });
    if (batch && batch.completedFiles + batch.failedFiles === batch.totalFiles) {
      await Batch.findOneAndUpdate(
        { batchId },
        {
          status: batch.failedFiles === batch.totalFiles ? 'failed' : 'completed',
          completedAt: new Date(),
        }
      );
    }

    console.log(`OCR completed for document ${documentId} in batch ${batchId}`);
  } catch (error) {
    console.error(`OCR failed for document ${documentId}:`, error);
    
    // Update document and batch to indicate OCR failure
    await Document.findByIdAndUpdate(documentId, {
      ocrText: '',
      ocrConfidence: 0,
      reviewStatus: 'pending',
    });

    await Batch.findOneAndUpdate(
      { batchId, 'documents.documentId': documentId },
      {
        $set: {
          'documents.$.status': 'failed',
          'documents.$.error': error instanceof Error ? error.message : 'OCR failed',
        },
        $inc: { failedFiles: 1 },
      }
    );

    // Check if batch is complete
    const batch = await Batch.findOne({ batchId });
    if (batch && batch.completedFiles + batch.failedFiles === batch.totalFiles) {
      await Batch.findOneAndUpdate(
        { batchId },
        {
          status: batch.failedFiles === batch.totalFiles ? 'failed' : 'completed',
          completedAt: new Date(),
        }
      );
    }
  }
}

// GET endpoint to list all batches
export async function GET() {
  try {
    await connectDB();
    
    const batches = await Batch.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-documents'); // Exclude documents for list view

    return NextResponse.json({
      success: true,
      batches,
    });
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}
