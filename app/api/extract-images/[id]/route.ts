// API route for extracting embedded images from a document
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import ExtractedImage from '@/models/ExtractedImage';
import { 
  detectEmbeddedImages, 
  saveExtractedImages,
  generateImageCaption,
  extractImageRegion 
} from '@/lib/image-detection';
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

    // Get the source image path
    const sourcePath = join(process.cwd(), 'public', document.imagePath);

    // Detect embedded images
    const detectedImages = await detectEmbeddedImages(sourcePath);

    if (detectedImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No embedded images detected',
        extractedImages: [],
      });
    }

    // Extract and save the images
    const extractedResults = await saveExtractedImages(id, detectedImages, sourcePath);

    // Generate captions for each extracted image
    const extractedImagesWithCaptions = await Promise.all(
      extractedResults.map(async (result) => {
        try {
          const imageBuffer = await extractImageRegion(sourcePath, result.boundingBox);
          const caption = await generateImageCaption(imageBuffer);
          return { ...result, caption: caption || result.caption };
        } catch {
          return result;
        }
      })
    );

    // Save to database
    const savedImages = await Promise.all(
      extractedImagesWithCaptions.map(async (img) => {
        const extractedImage = await ExtractedImage.create({
          parentDocumentId: new mongoose.Types.ObjectId(id),
          imagePath: img.imagePath,
          thumbnailPath: img.thumbnailPath,
          boundingBox: img.boundingBox,
          caption: img.caption,
          width: img.width,
          height: img.height,
        });
        return extractedImage;
      })
    );

    // Update document with extracted image references
    await Document.findByIdAndUpdate(id, {
      $push: {
        extractedImages: { $each: savedImages.map(img => img._id) },
      },
    });

    return NextResponse.json({
      success: true,
      extractedCount: savedImages.length,
      extractedImages: savedImages.map(img => ({
        _id: img._id.toString(),
        imagePath: img.imagePath,
        thumbnailPath: img.thumbnailPath,
        caption: img.caption,
        width: img.width,
        height: img.height,
      })),
    });
  } catch (error) {
    console.error('Image extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Image extraction failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get extracted images for a document
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

    const extractedImages = await ExtractedImage.find({
      parentDocumentId: new mongoose.Types.ObjectId(id),
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      extractedImages: extractedImages.map(img => ({
        _id: img._id.toString(),
        imagePath: img.imagePath,
        thumbnailPath: img.thumbnailPath,
        boundingBox: img.boundingBox,
        caption: img.caption,
        width: img.width,
        height: img.height,
        relatedMovies: img.relatedMovies,
        relatedCharacters: img.relatedCharacters,
        createdAt: img.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get extracted images:', error);
    return NextResponse.json(
      { error: 'Failed to get extracted images' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an extracted image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    if (!imageId || !mongoose.Types.ObjectId.isValid(imageId)) {
      return NextResponse.json(
        { error: 'Valid image ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Remove from ExtractedImage collection
    await ExtractedImage.findByIdAndDelete(imageId);

    // Remove reference from document
    await Document.findByIdAndUpdate(id, {
      $pull: { extractedImages: new mongoose.Types.ObjectId(imageId) },
    });

    return NextResponse.json({
      success: true,
      message: 'Extracted image removed',
    });
  } catch (error) {
    console.error('Failed to delete extracted image:', error);
    return NextResponse.json(
      { error: 'Failed to delete extracted image' },
      { status: 500 }
    );
  }
}
