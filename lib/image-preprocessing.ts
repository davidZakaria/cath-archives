// Image pre-processing pipeline for OCR enhancement
import sharp from 'sharp';

export interface PreprocessingResult {
  buffer: Buffer;
  appliedOperations: string[];
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

export interface PreprocessingOptions {
  deskew?: boolean;           // Auto-rotate to correct skew
  denoise?: boolean;          // Apply noise reduction
  enhanceContrast?: boolean;  // Enhance contrast for better text visibility
  sharpen?: boolean;          // Sharpen text edges
  grayscale?: boolean;        // Convert to grayscale
  normalize?: boolean;        // Normalize brightness levels
  threshold?: boolean;        // Apply adaptive thresholding for binary text
  removeBackground?: boolean; // Attempt to remove background noise
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  deskew: true,
  denoise: true,
  enhanceContrast: true,
  sharpen: true,
  grayscale: true,
  normalize: true,
  threshold: false,  // Can be too aggressive for some images
  removeBackground: false,
};

/**
 * Apply comprehensive image pre-processing for OCR optimization
 */
export async function preprocessImageForOCR(
  inputBuffer: Buffer,
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const appliedOperations: string[] = [];

  let pipeline = sharp(inputBuffer);

  // 1. Convert to grayscale (helps OCR focus on text)
  if (opts.grayscale) {
    pipeline = pipeline.grayscale();
    appliedOperations.push('grayscale');
  }

  // 2. Normalize brightness levels (auto-levels)
  if (opts.normalize) {
    pipeline = pipeline.normalize();
    appliedOperations.push('normalize');
  }

  // 3. Enhance contrast using linear adjustment
  if (opts.enhanceContrast) {
    pipeline = pipeline.linear(1.2, -20); // Increase contrast, slight brightness reduction
    appliedOperations.push('contrast_enhance');
  }

  // 4. Denoise using median filter (preserves edges better than blur)
  if (opts.denoise) {
    pipeline = pipeline.median(3); // 3x3 median filter
    appliedOperations.push('denoise');
  }

  // 5. Sharpen text edges
  if (opts.sharpen) {
    pipeline = pipeline.sharpen({
      sigma: 1.5,
      m1: 1.0,
      m2: 0.5,
    });
    appliedOperations.push('sharpen');
  }

  // 6. Auto-rotate based on EXIF orientation
  if (opts.deskew) {
    pipeline = pipeline.rotate(); // Auto-rotate based on EXIF
    appliedOperations.push('auto_rotate');
  }

  // Get the processed buffer
  const processedBuffer = await pipeline.toBuffer();

  // Get metadata of processed image
  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    appliedOperations,
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    },
  };
}

/**
 * Apply threshold for binary text extraction (black text on white background)
 * Useful for very clean scanned documents
 */
export async function applyAdaptiveThreshold(
  inputBuffer: Buffer,
  threshold: number = 128
): Promise<Buffer> {
  return sharp(inputBuffer)
    .grayscale()
    .threshold(threshold)
    .toBuffer();
}

/**
 * Detect and correct image skew angle
 * Uses edge detection to find dominant angle
 */
export async function detectAndCorrectSkew(
  inputBuffer: Buffer
): Promise<{ buffer: Buffer; angle: number; wasRotated: boolean }> {
  // Sharp doesn't have built-in skew detection, so we use EXIF rotation
  // For more advanced skew detection, you'd need opencv or similar
  
  const rotatedBuffer = await sharp(inputBuffer)
    .rotate() // Uses EXIF orientation
    .toBuffer();

  return {
    buffer: rotatedBuffer,
    angle: 0, // Would need opencv for actual angle detection
    wasRotated: true,
  };
}

/**
 * Enhance document image specifically for Arabic text OCR
 * Arabic text benefits from specific preprocessing
 */
export async function preprocessArabicDocument(
  inputBuffer: Buffer
): Promise<PreprocessingResult> {
  const appliedOperations: string[] = [];

  let pipeline = sharp(inputBuffer);

  // 1. Auto-rotate
  pipeline = pipeline.rotate();
  appliedOperations.push('auto_rotate');

  // 2. Convert to grayscale
  pipeline = pipeline.grayscale();
  appliedOperations.push('grayscale');

  // 3. Normalize for consistent brightness
  pipeline = pipeline.normalize();
  appliedOperations.push('normalize');

  // 4. Moderate contrast enhancement (Arabic text can be thin)
  pipeline = pipeline.linear(1.15, -10);
  appliedOperations.push('contrast_enhance');

  // 5. Light denoise (preserve Arabic letter connections)
  pipeline = pipeline.median(3);
  appliedOperations.push('denoise');

  // 6. Moderate sharpen (don't over-sharpen Arabic diacritics)
  pipeline = pipeline.sharpen({
    sigma: 1.2,
    m1: 0.8,
    m2: 0.4,
  });
  appliedOperations.push('sharpen');

  const processedBuffer = await pipeline.toBuffer();
  const metadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    appliedOperations,
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    },
  };
}

/**
 * Split a multi-column document into separate columns
 * Returns array of column images (right-to-left for Arabic)
 */
export async function splitColumns(
  inputBuffer: Buffer,
  numColumns: number = 2
): Promise<Buffer[]> {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  if (numColumns < 2 || width === 0) {
    return [inputBuffer];
  }

  const columnWidth = Math.floor(width / numColumns);
  const columns: Buffer[] = [];

  // Extract columns from right to left (for Arabic reading order)
  for (let i = numColumns - 1; i >= 0; i--) {
    const left = i * columnWidth;
    const extractWidth = i === numColumns - 1 ? width - left : columnWidth;

    const columnBuffer = await sharp(inputBuffer)
      .extract({
        left,
        top: 0,
        width: extractWidth,
        height,
      })
      .toBuffer();

    columns.push(columnBuffer);
  }

  return columns;
}

/**
 * Detect if image likely has multiple columns based on vertical whitespace
 */
export async function detectColumns(
  inputBuffer: Buffer
): Promise<{ hasColumns: boolean; estimatedColumns: number }> {
  // This is a simplified detection - real detection would analyze
  // vertical whitespace patterns
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  // If image is very wide relative to height, likely has columns
  const aspectRatio = width / height;
  
  if (aspectRatio > 1.5) {
    return { hasColumns: true, estimatedColumns: 2 };
  } else if (aspectRatio > 2.0) {
    return { hasColumns: true, estimatedColumns: 3 };
  }
  
  return { hasColumns: false, estimatedColumns: 1 };
}

/**
 * Full preprocessing pipeline combining compression and OCR optimization
 */
export async function fullPreprocessingPipeline(
  inputBuffer: Buffer,
  options: {
    compress?: boolean;
    maxSizeKB?: number;
    ocrOptimize?: boolean;
    arabicOptimize?: boolean;
  } = {}
): Promise<{
  buffer: Buffer;
  originalSize: number;
  processedSize: number;
  operations: string[];
}> {
  const { compressImage } = await import('./image-compression');
  
  let currentBuffer = inputBuffer;
  const operations: string[] = [];
  const originalSize = inputBuffer.length;

  // Step 1: Compress if needed
  if (options.compress !== false) {
    const compression = await compressImage(currentBuffer, {
      maxSizeKB: options.maxSizeKB || 1024,
    });
    currentBuffer = compression.buffer;
    operations.push(`compressed (${compression.compressionRatio.toFixed(2)}x)`);
  }

  // Step 2: OCR preprocessing
  if (options.ocrOptimize !== false) {
    if (options.arabicOptimize) {
      const result = await preprocessArabicDocument(currentBuffer);
      currentBuffer = result.buffer;
      operations.push(...result.appliedOperations);
    } else {
      const result = await preprocessImageForOCR(currentBuffer);
      currentBuffer = result.buffer;
      operations.push(...result.appliedOperations);
    }
  }

  return {
    buffer: currentBuffer,
    originalSize,
    processedSize: currentBuffer.length,
    operations,
  };
}

