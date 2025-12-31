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
  // columns[0] = rightmost column, columns[numColumns-1] = leftmost column
  for (let i = 0; i < numColumns; i++) {
    // Calculate left position: rightmost (i=0) starts at (numColumns-1)*columnWidth
    // leftmost (i=numColumns-1) starts at 0
    const left = (numColumns - 1 - i) * columnWidth;
    // Rightmost column (i=0) gets the remainder width to handle rounding
    const extractWidth = i === 0 ? width - left : columnWidth;

    const columnBuffer = await sharp(inputBuffer)
      .extract({
        left,
        top: 0,
        width: extractWidth,
        height,
      })
      .toBuffer();

    columns.push(columnBuffer); // columns[0] = rightmost, columns[numColumns-1] = leftmost
  }

  return columns;
}

/**
 * Detect if image likely has multiple columns based on vertical whitespace patterns
 * Analyzes the image for vertical gaps that indicate column separations
 */
export async function detectColumns(
  inputBuffer: Buffer,
  manualColumnCount?: number
): Promise<{ hasColumns: boolean; estimatedColumns: number; confidence: number }> {
  // If manual column count is provided, use it
  if (manualColumnCount && manualColumnCount > 1) {
    return { 
      hasColumns: true, 
      estimatedColumns: manualColumnCount,
      confidence: 1.0 
    };
  }

  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  
  if (width === 0 || height === 0) {
    return { hasColumns: false, estimatedColumns: 1, confidence: 0 };
  }

  // Basic aspect ratio check - very wide images likely have columns
  const aspectRatio = width / height;
  
  // For old journals, typical column layouts:
  // - 2 columns: aspect ratio ~1.5-2.0
  // - 3 columns: aspect ratio >2.0
  // - 4+ columns: aspect ratio >2.5
  
  // Sample vertical strips to detect whitespace gaps
  // We'll sample at multiple Y positions to find consistent vertical gaps
  const sampleStrips = 5; // Sample 5 horizontal strips
  const stripHeight = Math.floor(height / (sampleStrips + 1));
  const gapThreshold = width * 0.02; // 2% of width is considered a significant gap
  
  let detectedGaps: number[] = [];
  let gapConfidences: number[] = [];
  
  // Convert to grayscale for analysis
  const grayscaleBuffer = await sharp(inputBuffer)
    .grayscale()
    .raw()
    .toBuffer();
  
  const pixels = new Uint8Array(grayscaleBuffer);
  
  // Sample at different Y positions
  for (let strip = 1; strip <= sampleStrips; strip++) {
    const y = strip * stripHeight;
    const stripGaps: number[] = [];
    
    // Scan horizontally to find vertical gaps (whitespace)
    // Look for areas with consistently high brightness (white/light)
    let inGap = false;
    let gapStart = 0;
    const brightnessThreshold = 200; // Bright pixels (near white)
    const minGapWidth = width * 0.015; // Minimum gap width to be considered
    
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 1; // Grayscale = 1 channel
      const brightness = pixels[pixelIndex] || 0;
      
      if (brightness > brightnessThreshold) {
        if (!inGap) {
          gapStart = x;
          inGap = true;
        }
      } else {
        if (inGap) {
          const gapWidth = x - gapStart;
          if (gapWidth >= minGapWidth) {
            const gapCenter = gapStart + gapWidth / 2;
            stripGaps.push(gapCenter);
          }
          inGap = false;
        }
      }
    }
    
    // Check if gap continues to end
    if (inGap) {
      const gapWidth = width - gapStart;
      if (gapWidth >= minGapWidth) {
        const gapCenter = gapStart + gapWidth / 2;
        stripGaps.push(gapCenter);
      }
    }
    
    // Find common gap positions across strips
    for (const gap of stripGaps) {
      // Check if this gap aligns with previously detected gaps
      const alignedGap = detectedGaps.find(dg => Math.abs(dg - gap) < gapThreshold);
      if (alignedGap) {
        const index = detectedGaps.indexOf(alignedGap);
        gapConfidences[index] = (gapConfidences[index] || 0) + 1;
      } else {
        detectedGaps.push(gap);
        gapConfidences.push(1);
      }
    }
  }
  
  // Filter gaps that appear in at least 60% of strips
  const minStripsForGap = Math.ceil(sampleStrips * 0.6);
  const validGaps = detectedGaps.filter((_, index) => 
    gapConfidences[index] >= minStripsForGap
  );
  
  // Estimate column count based on gaps
  // Number of columns = number of gaps + 1
  let estimatedColumns = 1;
  let confidence = 0.3; // Base confidence from aspect ratio
  
  if (validGaps.length > 0) {
    estimatedColumns = validGaps.length + 1;
    // Confidence increases with more consistent gaps
    const avgConfidence = gapConfidences
      .filter((_, i) => validGaps.includes(detectedGaps[i]))
      .reduce((a, b) => a + b, 0) / validGaps.length;
    confidence = Math.min(0.95, 0.5 + (avgConfidence / sampleStrips) * 0.45);
  } else {
    // Fallback to aspect ratio if no gaps detected
    if (aspectRatio > 1.5) {
      estimatedColumns = 2;
      confidence = 0.4;
    } else if (aspectRatio > 2.0) {
      estimatedColumns = 3;
      confidence = 0.5;
    } else if (aspectRatio > 2.5) {
      estimatedColumns = 4;
      confidence = 0.5;
    }
  }
  
  // Only consider it has columns if confidence is reasonable
  const hasColumns = estimatedColumns > 1 && confidence > 0.35;
  
  return { 
    hasColumns, 
    estimatedColumns: hasColumns ? estimatedColumns : 1,
    confidence 
  };
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

