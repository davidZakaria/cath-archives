// Google Cloud Storage utilities for handling 800k+ images
import { Storage, Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Configuration
const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === 'true';
const GCS_BUCKET_ORIGINALS = process.env.GCS_BUCKET_ORIGINALS || 'arabic-archives-originals';
const GCS_BUCKET_EXTRACTED = process.env.GCS_BUCKET_EXTRACTED || 'arabic-archives-extracted';
const GCS_BUCKET_THUMBNAILS = process.env.GCS_BUCKET_THUMBNAILS || 'arabic-archives-thumbnails';

// Initialize Storage client
let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (storageClient) return storageClient;
  
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  
  if (credentials) {
    storageClient = new Storage({
      keyFilename: credentials,
      projectId,
    });
  } else {
    // Use default credentials (for GCP environments)
    storageClient = new Storage({ projectId });
  }
  
  return storageClient;
}

// Get or create a bucket
async function getBucket(bucketName: string): Promise<Bucket> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  
  const [exists] = await bucket.exists();
  if (!exists) {
    console.log(`Creating bucket: ${bucketName}`);
    await storage.createBucket(bucketName, {
      location: 'US', // Change as needed
      storageClass: 'STANDARD',
    });
  }
  
  return bucket;
}

export interface UploadResult {
  publicUrl: string;
  gcsUri: string;
  filename: string;
}

// Upload original scan image to cloud storage
export async function uploadOriginalImage(
  buffer: Buffer,
  originalFilename: string,
  documentId?: string
): Promise<UploadResult> {
  if (!USE_CLOUD_STORAGE) {
    // Fall back to local storage
    return uploadLocalImage(buffer, originalFilename, 'originals');
  }
  
  const bucket = await getBucket(GCS_BUCKET_ORIGINALS);
  const filename = generateFilename(originalFilename, documentId);
  const file = bucket.file(`originals/${filename}`);
  
  // Get content type from image
  const metadata = await sharp(buffer).metadata();
  const contentType = getContentType(metadata.format);
  
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        originalFilename,
        documentId: documentId || '',
        uploadedAt: new Date().toISOString(),
      },
    },
    resumable: false, // For smaller files
  });
  
  // Make public (or use signed URLs for private access)
  await file.makePublic();
  
  return {
    publicUrl: `https://storage.googleapis.com/${GCS_BUCKET_ORIGINALS}/originals/${filename}`,
    gcsUri: `gs://${GCS_BUCKET_ORIGINALS}/originals/${filename}`,
    filename,
  };
}

// Upload extracted image to cloud storage
export async function uploadExtractedImage(
  buffer: Buffer,
  parentDocumentId: string,
  imageIndex: number
): Promise<UploadResult> {
  if (!USE_CLOUD_STORAGE) {
    return uploadLocalImage(buffer, `extracted_${imageIndex}.jpg`, `extracted/${parentDocumentId}`);
  }
  
  const bucket = await getBucket(GCS_BUCKET_EXTRACTED);
  const filename = `${parentDocumentId}/${uuidv4()}.jpg`;
  const file = bucket.file(filename);
  
  // Convert to JPEG for consistency
  const jpegBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  
  await file.save(jpegBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      metadata: {
        parentDocumentId,
        imageIndex: String(imageIndex),
        uploadedAt: new Date().toISOString(),
      },
    },
  });
  
  await file.makePublic();
  
  return {
    publicUrl: `https://storage.googleapis.com/${GCS_BUCKET_EXTRACTED}/${filename}`,
    gcsUri: `gs://${GCS_BUCKET_EXTRACTED}/${filename}`,
    filename,
  };
}

// Upload thumbnail to cloud storage
export async function uploadThumbnail(
  buffer: Buffer,
  originalFilename: string,
  size: { width: number; height: number } = { width: 300, height: 300 }
): Promise<UploadResult> {
  // Generate thumbnail
  const thumbnailBuffer = await sharp(buffer)
    .resize(size.width, size.height, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  if (!USE_CLOUD_STORAGE) {
    return uploadLocalImage(thumbnailBuffer, `thumb_${originalFilename}`, 'thumbnails');
  }
  
  const bucket = await getBucket(GCS_BUCKET_THUMBNAILS);
  const filename = `${uuidv4()}_thumb.jpg`;
  const file = bucket.file(filename);
  
  await file.save(thumbnailBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      metadata: {
        originalFilename,
        uploadedAt: new Date().toISOString(),
      },
    },
  });
  
  await file.makePublic();
  
  return {
    publicUrl: `https://storage.googleapis.com/${GCS_BUCKET_THUMBNAILS}/${filename}`,
    gcsUri: `gs://${GCS_BUCKET_THUMBNAILS}/${filename}`,
    filename,
  };
}

// Download file from cloud storage
export async function downloadFile(gcsUri: string): Promise<Buffer> {
  const storage = getStorageClient();
  
  // Parse gs:// URI
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }
  
  const [, bucketName, filePath] = match;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  
  const [buffer] = await file.download();
  return buffer;
}

// Delete file from cloud storage
export async function deleteFile(gcsUri: string): Promise<void> {
  const storage = getStorageClient();
  
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }
  
  const [, bucketName, filePath] = match;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  
  await file.delete();
}

// Generate signed URL for private access
export async function getSignedUrl(
  gcsUri: string,
  expirationMinutes: number = 60
): Promise<string> {
  const storage = getStorageClient();
  
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }
  
  const [, bucketName, filePath] = match;
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000,
  });
  
  return url;
}

// List files in a bucket/prefix
export async function listFiles(
  bucketName: string,
  prefix?: string,
  maxResults: number = 1000
): Promise<string[]> {
  const storage = getStorageClient();
  const bucket = storage.bucket(bucketName);
  
  const [files] = await bucket.getFiles({
    prefix,
    maxResults,
  });
  
  return files.map(file => file.name);
}

// Get storage statistics
export async function getStorageStats(): Promise<{
  originals: { count: number; size: number };
  extracted: { count: number; size: number };
  thumbnails: { count: number; size: number };
}> {
  if (!USE_CLOUD_STORAGE) {
    return {
      originals: { count: 0, size: 0 },
      extracted: { count: 0, size: 0 },
      thumbnails: { count: 0, size: 0 },
    };
  }
  
  const storage = getStorageClient();
  
  const getStats = async (bucketName: string) => {
    try {
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles();
      
      let totalSize = 0;
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        totalSize += parseInt(metadata.size as string) || 0;
      }
      
      return { count: files.length, size: totalSize };
    } catch {
      return { count: 0, size: 0 };
    }
  };
  
  const [originals, extracted, thumbnails] = await Promise.all([
    getStats(GCS_BUCKET_ORIGINALS),
    getStats(GCS_BUCKET_EXTRACTED),
    getStats(GCS_BUCKET_THUMBNAILS),
  ]);
  
  return { originals, extracted, thumbnails };
}

// Helper: Generate unique filename
function generateFilename(originalFilename: string, documentId?: string): string {
  const timestamp = Date.now();
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const extension = safeFilename.split('.').pop() || 'jpg';
  const prefix = documentId || uuidv4();
  return `${prefix}_${timestamp}.${extension}`;
}

// Helper: Get content type from format
function getContentType(format: string | undefined): string {
  const types: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };
  return types[format?.toLowerCase() || ''] || 'image/jpeg';
}

// Helper: Local storage fallback
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function uploadLocalImage(
  buffer: Buffer,
  filename: string,
  subfolder: string
): Promise<UploadResult> {
  const uploadsDir = join(process.cwd(), 'public', 'uploads', subfolder);
  await mkdir(uploadsDir, { recursive: true });
  
  const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filepath = join(uploadsDir, safeFilename);
  
  await writeFile(filepath, buffer);
  
  return {
    publicUrl: `/uploads/${subfolder}/${safeFilename}`,
    gcsUri: '', // No GCS URI for local storage
    filename: safeFilename,
  };
}

// Check if cloud storage is enabled
export function isCloudStorageEnabled(): boolean {
  return USE_CLOUD_STORAGE;
}

// Export configuration for reference
export const cloudStorageConfig = {
  enabled: USE_CLOUD_STORAGE,
  buckets: {
    originals: GCS_BUCKET_ORIGINALS,
    extracted: GCS_BUCKET_EXTRACTED,
    thumbnails: GCS_BUCKET_THUMBNAILS,
  },
};
