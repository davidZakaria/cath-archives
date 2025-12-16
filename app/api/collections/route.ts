// API route for creating and listing collections (multi-page articles)
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import Collection from '@/models/Collection';
// Import models to register them with Mongoose (needed for populate)
import '@/models/Movie';
import '@/models/Character';
import { performOCRFromBuffer } from '@/lib/google-vision';
import sharp from 'sharp';

// POST - Create a new collection with multiple pages
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const title = formData.get('title') as string || 'مجموعة جديدة';
    
    // Get linked entity info
    const linkType = formData.get('linkType') as string | null;
    const linkedMovie = formData.get('linkedMovie') as string | null;
    const linkedCharacter = formData.get('linkedCharacter') as string | null;

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

    await connectDB();

    // Create collection record with linked entity and draft status
    const collectionId = uuidv4();
    const collection = await Collection.create({
      title,
      totalPages: imageFiles.length,
      pages: [],
      processingStatus: 'uploading',
      status: 'draft', // Start as draft
      ocrCompletedPages: 0,
      aiCompletedPages: 0,
      // Link to movie or character if provided
      ...(linkType === 'movie' && linkedMovie ? { linkedMovie, linkType: 'movie' } : {}),
      ...(linkType === 'character' && linkedCharacter ? { linkedCharacter, linkType: 'character' } : {}),
    });

    // Process each file as a page
    const pages = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      
      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Get image metadata
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
        const filename = `${collection._id}_page${i + 1}_${timestamp}_${safeFilename}`;
        
        // Create collection subfolder
        const collectionDir = join(process.cwd(), 'public', 'uploads', 'collections', collection._id.toString());
        await mkdir(collectionDir, { recursive: true });
        
        const filepath = join(collectionDir, filename);
        await writeFile(filepath, buffer);

        const imagePath = `/uploads/collections/${collection._id}/${filename}`;

        // Create document record for this page
        const document = await Document.create({
          filename: file.name,
          imagePath: imagePath,
          imageMetadata: imageMetadata,
          reviewStatus: 'pending',
          uploadedAt: new Date(),
          collectionId: collection._id.toString(),
        });

        // Add page to collection
        pages.push({
          documentId: document._id,
          pageNumber: i + 1,
          imagePath: imagePath,
        });

        // Set cover image to first page
        if (i === 0) {
          collection.coverImagePath = imagePath;
        }

        // Start OCR processing in background
        processPageOCR(document._id.toString(), buffer, collection._id.toString(), i + 1).catch(console.error);

      } catch (error) {
        console.error(`Failed to process page ${i + 1}:`, error);
      }
    }

    // Update collection with pages
    await Collection.findByIdAndUpdate(collection._id, {
      pages,
      processingStatus: 'processing_ocr',
    });

    return NextResponse.json({
      success: true,
      collection: {
        _id: collection._id.toString(),
        title: collection.title,
        totalPages: imageFiles.length,
        processingStatus: 'processing_ocr',
      },
    });
  } catch (error) {
    console.error('Collection creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Background OCR processing for a page with accuracy tracking
async function processPageOCR(
  documentId: string,
  imageBuffer: Buffer,
  collectionId: string,
  pageNumber: number
) {
  try {
    const ocrResult = await performOCRFromBuffer(imageBuffer);

    await connectDB();

    // Update document with OCR results and confidence
    await Document.findByIdAndUpdate(documentId, {
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      ocrBlocks: ocrResult.blocks,
      ocrProcessedAt: new Date(),
      verifiedText: ocrResult.text,
    });

    // Update collection page with OCR text and accuracy metrics
    const collection = await Collection.findByIdAndUpdate(
      collectionId,
      {
        $set: {
          [`pages.${pageNumber - 1}.ocrText`]: ocrResult.text,
          [`pages.${pageNumber - 1}.ocrConfidence`]: ocrResult.confidence,
          [`pages.${pageNumber - 1}.detectedTitles`]: ocrResult.accuracyMetrics?.detectedTitles || [],
        },
        $inc: { ocrCompletedPages: 1 },
      },
      { new: true }
    );

    // Check if all pages are complete
    if (collection && collection.ocrCompletedPages >= collection.totalPages) {
      // Combine all OCR text
      const combinedText = collection.pages
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map(p => p.ocrText || '')
        .join('\n\n--- صفحة جديدة ---\n\n');

      // Calculate overall accuracy score (average of all page confidences)
      const pageConfidences = collection.pages
        .map(p => p.ocrConfidence || 0)
        .filter(c => c > 0);
      
      const avgConfidence = pageConfidences.length > 0
        ? pageConfidences.reduce((a, b) => a + b, 0) / pageConfidences.length
        : 0;
      
      // Collect all detected titles from pages
      const allTitles = collection.pages
        .flatMap(p => p.detectedTitles || [])
        .filter((title, index, arr) => arr.indexOf(title) === index) // Unique
        .slice(0, 5);

      await Collection.findByIdAndUpdate(collectionId, {
        combinedOcrText: combinedText,
        processingStatus: 'completed',
        status: 'pending_review',
        accuracyScore: Math.round(avgConfidence * 100),
        accuracyMetrics: {
          overallConfidence: Math.round(avgConfidence * 100),
          highConfidenceBlocksPercent: ocrResult.accuracyMetrics?.highConfidenceBlocksPercent || 0,
          lowConfidenceBlocksPercent: ocrResult.accuracyMetrics?.lowConfidenceBlocksPercent || 0,
          averageFontSize: ocrResult.accuracyMetrics?.averageFontSize || 16,
          detectedTitles: allTitles,
        },
      });
    }

    console.log(`OCR completed for page ${pageNumber} of collection ${collectionId} (confidence: ${Math.round(ocrResult.confidence * 100)}%)`);
  } catch (error) {
    console.error(`OCR failed for page ${pageNumber}:`, error);
  }
}

// GET - List all collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processingStatus = searchParams.get('processingStatus');
    const publicationStatus = searchParams.get('status'); // draft, pending_review, published
    const linkedMovie = searchParams.get('linkedMovie');
    const linkedCharacter = searchParams.get('linkedCharacter');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    await connectDB();

    const query: Record<string, unknown> = {};
    
    // Filter by processing status
    if (processingStatus && processingStatus !== 'all') {
      query.processingStatus = processingStatus;
    }
    
    // Filter by publication status
    if (publicationStatus && publicationStatus !== 'all') {
      query.status = publicationStatus;
    }
    
    // Filter by linked movie
    if (linkedMovie) {
      query.linkedMovie = linkedMovie;
    }
    
    // Filter by linked character
    if (linkedCharacter) {
      query.linkedCharacter = linkedCharacter;
    }

    const [collections, total] = await Promise.all([
      Collection.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-combinedOcrText -combinedAiText') // Exclude large text fields for list
        .populate('linkedMovie', 'arabicName englishName year')
        .populate('linkedCharacter', 'arabicName englishName type'),
      Collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      collections,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + collections.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}
