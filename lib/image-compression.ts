// Image compression utility for upload optimization
import sharp from 'sharp';

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxSizeKB?: number;      // Target max size in KB (default: 1024 = 1MB)
  minQuality?: number;     // Minimum quality to try (default: 20)
  maxWidth?: number;       // Max width for resize (default: 3000)
  maxHeight?: number;      // Max height for resize (default: 4000)
  format?: 'jpeg' | 'webp' | 'png';  // Output format (default: jpeg)
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeKB: 1024,      // 1MB target
  minQuality: 20,
  maxWidth: 3000,
  maxHeight: 4000,
  format: 'jpeg',
};

/**
 * Compress an image to meet the target size while maintaining quality
 * Uses progressive quality reduction and optional resize
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const targetBytes = opts.maxSizeKB * 1024;
  const originalSize = inputBuffer.length;

  // If already under target size, just optimize without heavy compression
  if (originalSize <= targetBytes) {
    const optimized = await sharp(inputBuffer)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    
    const metadata = await sharp(optimized).metadata();
    
    return {
      buffer: optimized,
      originalSize,
      compressedSize: optimized.length,
      compressionRatio: originalSize / optimized.length,
      format: 'jpeg',
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  // Get original dimensions
  const originalMetadata = await sharp(inputBuffer).metadata();
  let currentWidth = originalMetadata.width || 0;
  let currentHeight = originalMetadata.height || 0;

  // First, resize if image is too large
  let resizedBuffer = inputBuffer;
  if (currentWidth > opts.maxWidth || currentHeight > opts.maxHeight) {
    resizedBuffer = await sharp(inputBuffer)
      .resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
    
    const resizedMeta = await sharp(resizedBuffer).metadata();
    currentWidth = resizedMeta.width || currentWidth;
    currentHeight = resizedMeta.height || currentHeight;
  }

  // Progressive quality reduction
  let quality = 90;
  let result = resizedBuffer;
  let attempts = 0;
  const maxAttempts = 10;

  while (result.length > targetBytes && quality >= opts.minQuality && attempts < maxAttempts) {
    if (opts.format === 'jpeg') {
      result = await sharp(resizedBuffer)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else if (opts.format === 'webp') {
      result = await sharp(resizedBuffer)
        .webp({ quality })
        .toBuffer();
    } else {
      result = await sharp(resizedBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

    // If still too large, reduce quality more aggressively
    if (result.length > targetBytes) {
      quality -= 10;
    }
    attempts++;
  }

  // If still over target after quality reduction, try additional resize
  if (result.length > targetBytes && quality <= opts.minQuality) {
    const scaleFactor = Math.sqrt(targetBytes / result.length);
    const newWidth = Math.floor(currentWidth * scaleFactor);
    const newHeight = Math.floor(currentHeight * scaleFactor);

    result = await sharp(resizedBuffer)
      .resize(newWidth, newHeight, { fit: 'inside' })
      .jpeg({ quality: opts.minQuality, mozjpeg: true })
      .toBuffer();

    const finalMeta = await sharp(result).metadata();
    currentWidth = finalMeta.width || newWidth;
    currentHeight = finalMeta.height || newHeight;
  }

  return {
    buffer: result,
    originalSize,
    compressedSize: result.length,
    compressionRatio: originalSize / result.length,
    format: opts.format,
    width: currentWidth,
    height: currentHeight,
  };
}

/**
 * Compress multiple images in parallel with progress tracking
 */
export async function compressImages(
  buffers: Buffer[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  let completed = 0;

  for (const buffer of buffers) {
    const result = await compressImage(buffer, options);
    results.push(result);
    completed++;
    onProgress?.(completed, buffers.length);
  }

  return results;
}

/**
 * Get compression statistics summary
 */
export function getCompressionStats(results: CompressionResult[]): {
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSaved: number;
  averageRatio: number;
  savedPercentage: number;
} {
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const totalSaved = totalOriginalSize - totalCompressedSize;
  const averageRatio = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
  const savedPercentage = (totalSaved / totalOriginalSize) * 100;

  return {
    totalOriginalSize,
    totalCompressedSize,
    totalSaved,
    averageRatio,
    savedPercentage,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

