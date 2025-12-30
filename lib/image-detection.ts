// Image detection and extraction for embedded photos in scanned pages
import vision from '@google-cloud/vision';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BoundingBox } from '@/types';

// Initialize Vision client - using type assertion to guarantee non-null
const getVisionClient = (): InstanceType<typeof vision.ImageAnnotatorClient> => {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (apiKey) {
    return new vision.ImageAnnotatorClient({ apiKey });
  } else if (credentials) {
    return new vision.ImageAnnotatorClient({ keyFilename: credentials });
  } else {
    return new vision.ImageAnnotatorClient();
  }
};

export interface DetectedImage {
  boundingBox: BoundingBox;
  confidence: number;
  label?: string;
  description?: string;
}

export interface ExtractedImageResult {
  id: string;
  imagePath: string;
  thumbnailPath: string;
  boundingBox: BoundingBox;
  caption?: string;
  width: number;
  height: number;
}

// Detect embedded images/photos within a scanned page
export async function detectEmbeddedImages(
  imagePath: string
): Promise<DetectedImage[]> {
  const client = getVisionClient();
  
  try {
    // Use object localization to find distinct objects
    // @ts-expect-error - Vision API types are not perfect
    const [objectResult] = await client.objectLocalization({
      image: { source: { filename: imagePath } },
    });

    const detectedImages: DetectedImage[] = [];
    const objects = objectResult.localizedObjectAnnotations || [];

    // Filter for person/photo-like objects
    const photoLabels = ['person', 'human face', 'photograph', 'picture', 'portrait', 'image'];
    
    for (const obj of objects) {
      const name = obj.name?.toLowerCase() || '';
      const score = obj.score || 0;
      
      // Check if this might be a photo (person, portrait, etc.)
      const isPhotoLike = photoLabels.some(label => name.includes(label)) || score > 0.7;
      
      if (isPhotoLike && obj.boundingPoly?.normalizedVertices) {
        const vertices = obj.boundingPoly.normalizedVertices;
        
        if (vertices.length >= 4) {
          // Convert normalized coordinates to absolute
          const metadata = await sharp(imagePath).metadata();
          const imgWidth = metadata.width || 1;
          const imgHeight = metadata.height || 1;
          
          const x = Math.round((vertices[0].x || 0) * imgWidth);
          const y = Math.round((vertices[0].y || 0) * imgHeight);
          const width = Math.round(((vertices[2].x || 0) - (vertices[0].x || 0)) * imgWidth);
          const height = Math.round(((vertices[2].y || 0) - (vertices[0].y || 0)) * imgHeight);
          
          // Only include reasonably sized regions (at least 50x50 pixels)
          if (width > 50 && height > 50) {
            detectedImages.push({
              boundingBox: { x, y, width, height },
              confidence: score,
              label: obj.name || undefined,
              description: undefined,
            });
          }
        }
      }
    }

    // Also use face detection to find portraits
    const [faceResult] = await client.faceDetection({
      image: { source: { filename: imagePath } },
    });

    const faces = faceResult.faceAnnotations || [];
    
    for (const face of faces) {
      if (face.boundingPoly?.vertices) {
        const vertices = face.boundingPoly.vertices;
        
        if (vertices.length >= 4) {
          const x = vertices[0].x || 0;
          const y = vertices[0].y || 0;
          const width = (vertices[2].x || 0) - x;
          const height = (vertices[2].y || 0) - y;
          
          // Expand face bounding box to include more of the photo
          const expandFactor = 0.5;
          const expandedX = Math.max(0, x - width * expandFactor);
          const expandedY = Math.max(0, y - height * expandFactor);
          const expandedWidth = width * (1 + expandFactor * 2);
          const expandedHeight = height * (1 + expandFactor * 2);
          
          // Check if this overlaps with existing detections
          const overlaps = detectedImages.some(img => 
            boxesOverlap(img.boundingBox, {
              x: expandedX,
              y: expandedY,
              width: expandedWidth,
              height: expandedHeight,
            })
          );
          
          if (!overlaps && expandedWidth > 50 && expandedHeight > 50) {
            detectedImages.push({
              boundingBox: {
                x: Math.round(expandedX),
                y: Math.round(expandedY),
                width: Math.round(expandedWidth),
                height: Math.round(expandedHeight),
              },
              confidence: face.detectionConfidence || 0.8,
              label: 'portrait',
              description: 'Detected face/portrait',
            });
          }
        }
      }
    }

    return detectedImages;
  } catch (error) {
    console.error('Image detection error:', error);
    throw new Error(`Image detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Detect images from buffer
export async function detectEmbeddedImagesFromBuffer(
  imageBuffer: Buffer
): Promise<DetectedImage[]> {
  const client = getVisionClient();
  
  try {
    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1;
    const imgHeight = metadata.height || 1;

    const detectedImages: DetectedImage[] = [];

    // Use object localization
    // @ts-expect-error - Vision API types are not perfect
    const [objectResult] = await client.objectLocalization({
      image: { content: imageBuffer },
    });

    const objects = objectResult.localizedObjectAnnotations || [];
    const photoLabels = ['person', 'human face', 'photograph', 'picture', 'portrait', 'image'];
    
    for (const obj of objects) {
      const name = obj.name?.toLowerCase() || '';
      const score = obj.score || 0;
      
      const isPhotoLike = photoLabels.some(label => name.includes(label)) || score > 0.7;
      
      if (isPhotoLike && obj.boundingPoly?.normalizedVertices) {
        const vertices = obj.boundingPoly.normalizedVertices;
        
        if (vertices.length >= 4) {
          const x = Math.round((vertices[0].x || 0) * imgWidth);
          const y = Math.round((vertices[0].y || 0) * imgHeight);
          const width = Math.round(((vertices[2].x || 0) - (vertices[0].x || 0)) * imgWidth);
          const height = Math.round(((vertices[2].y || 0) - (vertices[0].y || 0)) * imgHeight);
          
          if (width > 50 && height > 50) {
            detectedImages.push({
              boundingBox: { x, y, width, height },
              confidence: score,
              label: obj.name || undefined,
            });
          }
        }
      }
    }

    // Face detection
    const [faceResult] = await client.faceDetection({
      image: { content: imageBuffer },
    });

    const faces = faceResult.faceAnnotations || [];
    
    for (const face of faces) {
      if (face.boundingPoly?.vertices) {
        const vertices = face.boundingPoly.vertices;
        
        if (vertices.length >= 4) {
          const x = vertices[0].x || 0;
          const y = vertices[0].y || 0;
          const width = (vertices[2].x || 0) - x;
          const height = (vertices[2].y || 0) - y;
          
          const expandFactor = 0.5;
          const expandedX = Math.max(0, x - width * expandFactor);
          const expandedY = Math.max(0, y - height * expandFactor);
          const expandedWidth = width * (1 + expandFactor * 2);
          const expandedHeight = height * (1 + expandFactor * 2);
          
          const overlaps = detectedImages.some(img => 
            boxesOverlap(img.boundingBox, {
              x: expandedX,
              y: expandedY,
              width: expandedWidth,
              height: expandedHeight,
            })
          );
          
          if (!overlaps && expandedWidth > 50 && expandedHeight > 50) {
            detectedImages.push({
              boundingBox: {
                x: Math.round(expandedX),
                y: Math.round(expandedY),
                width: Math.round(expandedWidth),
                height: Math.round(expandedHeight),
              },
              confidence: face.detectionConfidence || 0.8,
              label: 'portrait',
            });
          }
        }
      }
    }

    return detectedImages;
  } catch (error) {
    console.error('Image detection error:', error);
    throw new Error(`Image detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract a region from an image
export async function extractImageRegion(
  sourcePath: string,
  boundingBox: BoundingBox
): Promise<Buffer> {
  try {
    const image = sharp(sourcePath);
    const metadata = await image.metadata();
    
    // Ensure coordinates are within bounds
    const x = Math.max(0, boundingBox.x);
    const y = Math.max(0, boundingBox.y);
    const width = Math.min(boundingBox.width, (metadata.width || 0) - x);
    const height = Math.min(boundingBox.height, (metadata.height || 0) - y);
    
    return await image
      .extract({ left: x, top: y, width, height })
      .toBuffer();
  } catch (error) {
    console.error('Image extraction error:', error);
    throw new Error(`Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract region from buffer
export async function extractImageRegionFromBuffer(
  sourceBuffer: Buffer,
  boundingBox: BoundingBox
): Promise<Buffer> {
  try {
    const image = sharp(sourceBuffer);
    const metadata = await image.metadata();
    
    const x = Math.max(0, boundingBox.x);
    const y = Math.max(0, boundingBox.y);
    const width = Math.min(boundingBox.width, (metadata.width || 0) - x);
    const height = Math.min(boundingBox.height, (metadata.height || 0) - y);
    
    return await image
      .extract({ left: x, top: y, width, height })
      .toBuffer();
  } catch (error) {
    console.error('Image extraction error:', error);
    throw new Error(`Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Save extracted images to disk
export async function saveExtractedImages(
  documentId: string,
  detectedImages: DetectedImage[],
  sourcePath: string
): Promise<ExtractedImageResult[]> {
  const results: ExtractedImageResult[] = [];
  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'extracted', documentId);
  
  // Create directory if it doesn't exist
  await mkdir(uploadsDir, { recursive: true });
  
  for (let i = 0; i < detectedImages.length; i++) {
    const detected = detectedImages[i];
    const imageId = uuidv4();
    
    try {
      // Extract the image region
      const extractedBuffer = await extractImageRegion(sourcePath, detected.boundingBox);
      
      // Get dimensions
      const metadata = await sharp(extractedBuffer).metadata();
      
      // Save full image
      const imageName = `${imageId}.jpg`;
      const imagePath = join(uploadsDir, imageName);
      await writeFile(imagePath, await sharp(extractedBuffer).jpeg({ quality: 90 }).toBuffer());
      
      // Create and save thumbnail
      const thumbnailName = `${imageId}_thumb.jpg`;
      const thumbnailPath = join(uploadsDir, thumbnailName);
      await writeFile(
        thumbnailPath,
        await sharp(extractedBuffer)
          .resize(200, 200, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer()
      );
      
      results.push({
        id: imageId,
        imagePath: `/uploads/extracted/${documentId}/${imageName}`,
        thumbnailPath: `/uploads/extracted/${documentId}/${thumbnailName}`,
        boundingBox: detected.boundingBox,
        caption: detected.description || detected.label,
        width: metadata.width || 0,
        height: metadata.height || 0,
      });
    } catch (error) {
      console.error(`Failed to extract image ${i}:`, error);
      // Continue with other images
    }
  }
  
  return results;
}

// Helper function to check if two boxes overlap
function boxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
  const overlapThreshold = 0.5; // 50% overlap threshold
  
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  if (x1 >= x2 || y1 >= y2) return false;
  
  const intersectionArea = (x2 - x1) * (y2 - y1);
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const minArea = Math.min(box1Area, box2Area);
  
  return intersectionArea / minArea > overlapThreshold;
}

// Use AI to generate captions for extracted images
export async function generateImageCaption(
  imageBuffer: Buffer
): Promise<string | undefined> {
  const client = getVisionClient();
  
  try {
    const [result] = await client.labelDetection({
      image: { content: imageBuffer },
    });
    
    const labels = result.labelAnnotations || [];
    
    // Build a simple caption from top labels
    const topLabels = labels
      .filter(l => (l.score || 0) > 0.7)
      .slice(0, 3)
      .map(l => l.description)
      .filter(Boolean);
    
    if (topLabels.length > 0) {
      return topLabels.join(', ');
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}
