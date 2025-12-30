// OCR Orchestrator - Runs multiple OCR engines and picks the best result
import { performOCRFromBuffer } from './google-vision';
import { performTesseractOCR } from './tesseract-ocr';
import { preprocessArabicDocument } from './image-preprocessing';
import { OCRBlock } from '@/types';

export interface OCREngineResult {
  engine: 'google-vision' | 'tesseract';
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  processingTimeMs: number;
  error?: string;
}

export interface OrchestratedOCRResult {
  bestResult: OCREngineResult;
  allResults: OCREngineResult[];
  selectedEngine: 'google-vision' | 'tesseract';
  selectionReason: string;
  totalProcessingTimeMs: number;
  accuracyMetrics?: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
}

export interface OrchestratorOptions {
  engines?: Array<'google-vision' | 'tesseract'>;
  preferEngine?: 'google-vision' | 'tesseract' | 'best';
  runParallel?: boolean;
  preprocess?: boolean;
  confidenceThreshold?: number; // Min confidence to accept result
}

const DEFAULT_OPTIONS: Required<OrchestratorOptions> = {
  engines: ['google-vision', 'tesseract'],
  preferEngine: 'best',
  runParallel: true,
  preprocess: true,
  confidenceThreshold: 0.3,
};

/**
 * Run OCR using Google Cloud Vision
 */
async function runGoogleVision(imageBuffer: Buffer): Promise<OCREngineResult> {
  const startTime = Date.now();
  
  try {
    const result = await performOCRFromBuffer(imageBuffer);
    
    return {
      engine: 'google-vision',
      text: result.text,
      confidence: result.confidence,
      blocks: result.blocks,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      engine: 'google-vision',
      text: '',
      confidence: 0,
      blocks: [],
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run OCR using Tesseract
 */
async function runTesseract(imageBuffer: Buffer): Promise<OCREngineResult> {
  const startTime = Date.now();
  
  try {
    const result = await performTesseractOCR(imageBuffer);
    
    return {
      engine: 'tesseract',
      text: result.text,
      confidence: result.confidence,
      blocks: result.blocks,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      engine: 'tesseract',
      text: '',
      confidence: 0,
      blocks: [],
      processingTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate text quality score based on various metrics
 */
function calculateTextQualityScore(result: OCREngineResult): number {
  let score = 0;
  
  // Base confidence score (0-40 points)
  score += result.confidence * 40;
  
  // Text length score (0-20 points) - prefer longer text up to a point
  const textLength = result.text.trim().length;
  if (textLength > 100) score += 10;
  if (textLength > 500) score += 5;
  if (textLength > 1000) score += 5;
  
  // Arabic character ratio (0-20 points) - prefer more Arabic text
  const arabicChars = (result.text.match(/[\u0600-\u06FF]/g) || []).length;
  const arabicRatio = textLength > 0 ? arabicChars / textLength : 0;
  score += arabicRatio * 20;
  
  // Block count score (0-10 points) - more blocks usually means better detection
  const blockCount = result.blocks.length;
  if (blockCount >= 3) score += 5;
  if (blockCount >= 10) score += 5;
  
  // Average block confidence (0-10 points)
  if (result.blocks.length > 0) {
    const avgBlockConfidence = result.blocks.reduce((sum, b) => sum + b.confidence, 0) / result.blocks.length;
    score += avgBlockConfidence * 10;
  }
  
  return score;
}

/**
 * Select the best result from multiple OCR engines
 */
function selectBestResult(
  results: OCREngineResult[],
  preferEngine: 'google-vision' | 'tesseract' | 'best',
  confidenceThreshold: number
): { result: OCREngineResult; reason: string } {
  // Filter out failed results
  const validResults = results.filter(r => !r.error && r.confidence >= confidenceThreshold);
  
  if (validResults.length === 0) {
    // If no valid results, return the one with highest confidence anyway
    const best = results.reduce((a, b) => a.confidence > b.confidence ? a : b);
    return { result: best, reason: 'Only available result (below threshold)' };
  }
  
  if (validResults.length === 1) {
    return { result: validResults[0], reason: 'Only valid result' };
  }
  
  // If user prefers a specific engine and it's valid
  if (preferEngine !== 'best') {
    const preferred = validResults.find(r => r.engine === preferEngine);
    if (preferred && preferred.confidence >= confidenceThreshold) {
      return { result: preferred, reason: `User preferred engine: ${preferEngine}` };
    }
  }
  
  // Calculate quality scores for each result
  const scoredResults = validResults.map(r => ({
    result: r,
    score: calculateTextQualityScore(r),
  }));
  
  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);
  
  const best = scoredResults[0];
  const secondBest = scoredResults[1];
  
  // Determine reason
  let reason = `Highest quality score: ${best.score.toFixed(1)}`;
  if (secondBest) {
    const scoreDiff = best.score - secondBest.score;
    if (scoreDiff < 5) {
      reason += ` (close to ${secondBest.result.engine}: ${secondBest.score.toFixed(1)})`;
    }
  }
  
  return { result: best.result, reason };
}

/**
 * Merge complementary results from multiple OCR engines
 * Useful when different engines detect different parts of the document
 */
function mergeResults(results: OCREngineResult[]): string {
  // For now, we just pick the best one
  // Future enhancement: merge non-overlapping text segments
  const validResults = results.filter(r => !r.error && r.text.trim().length > 0);
  
  if (validResults.length === 0) return '';
  if (validResults.length === 1) return validResults[0].text;
  
  // Pick the one with best quality score
  const best = validResults.reduce((a, b) => 
    calculateTextQualityScore(a) > calculateTextQualityScore(b) ? a : b
  );
  
  return best.text;
}

/**
 * Main orchestrator function - runs multiple OCR engines and returns the best result
 */
export async function orchestrateOCR(
  imageBuffer: Buffer,
  options: OrchestratorOptions = {}
): Promise<OrchestratedOCRResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  // Preprocess image if enabled
  let processedBuffer = imageBuffer;
  if (opts.preprocess) {
    const preprocessed = await preprocessArabicDocument(imageBuffer);
    processedBuffer = preprocessed.buffer;
    console.log(`[OCR Orchestrator] Preprocessing applied: ${preprocessed.appliedOperations.join(', ')}`);
  }
  
  // Run OCR engines
  const results: OCREngineResult[] = [];
  
  if (opts.runParallel && opts.engines.length > 1) {
    // Run in parallel
    console.log(`[OCR Orchestrator] Running ${opts.engines.length} engines in parallel...`);
    
    const promises: Promise<OCREngineResult>[] = [];
    
    if (opts.engines.includes('google-vision')) {
      promises.push(runGoogleVision(processedBuffer));
    }
    if (opts.engines.includes('tesseract')) {
      promises.push(runTesseract(processedBuffer));
    }
    
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Run sequentially
    console.log(`[OCR Orchestrator] Running ${opts.engines.length} engines sequentially...`);
    
    for (const engine of opts.engines) {
      if (engine === 'google-vision') {
        results.push(await runGoogleVision(processedBuffer));
      } else if (engine === 'tesseract') {
        results.push(await runTesseract(processedBuffer));
      }
    }
  }
  
  // Log results summary
  for (const result of results) {
    if (result.error) {
      console.log(`[OCR Orchestrator] ${result.engine}: FAILED - ${result.error}`);
    } else {
      console.log(`[OCR Orchestrator] ${result.engine}: ${result.text.length} chars, ${Math.round(result.confidence * 100)}% confidence, ${result.processingTimeMs}ms`);
    }
  }
  
  // Select best result
  const { result: bestResult, reason } = selectBestResult(results, opts.preferEngine, opts.confidenceThreshold);
  
  console.log(`[OCR Orchestrator] Selected: ${bestResult.engine} - ${reason}`);
  
  // Calculate accuracy metrics from the best result
  const accuracyMetrics = calculateAccuracyMetrics(bestResult);
  
  return {
    bestResult,
    allResults: results,
    selectedEngine: bestResult.engine,
    selectionReason: reason,
    totalProcessingTimeMs: Date.now() - startTime,
    accuracyMetrics,
  };
}

/**
 * Calculate accuracy metrics from OCR result
 */
function calculateAccuracyMetrics(result: OCREngineResult): OrchestratedOCRResult['accuracyMetrics'] {
  const blocks = result.blocks;
  
  if (blocks.length === 0) {
    return {
      overallConfidence: Math.round(result.confidence * 100),
      highConfidenceBlocksPercent: 0,
      lowConfidenceBlocksPercent: 0,
      averageFontSize: 16,
      detectedTitles: [],
    };
  }
  
  const highConfBlocks = blocks.filter(b => b.confidence >= 0.9).length;
  const lowConfBlocks = blocks.filter(b => b.confidence < 0.7).length;
  
  // Detect potential titles (large text blocks at top of image)
  const detectedTitles: string[] = [];
  const sortedByY = [...blocks].sort((a, b) => (a.boundingBox?.y || 0) - (b.boundingBox?.y || 0));
  const topBlocks = sortedByY.slice(0, 3);
  
  for (const block of topBlocks) {
    const text = block.text.trim();
    // Title heuristics: short, high confidence, few words
    if (text.length > 5 && text.length < 100 && block.confidence >= 0.8) {
      const wordCount = text.split(/\s+/).length;
      if (wordCount <= 10) {
        detectedTitles.push(text);
      }
    }
  }
  
  // Estimate average font size from block heights
  const avgHeight = blocks.reduce((sum, b) => sum + (b.boundingBox?.height || 0), 0) / blocks.length;
  const estimatedFontSize = Math.max(10, Math.min(32, Math.round(avgHeight * 0.7)));
  
  return {
    overallConfidence: Math.round(result.confidence * 100),
    highConfidenceBlocksPercent: Math.round((highConfBlocks / blocks.length) * 100),
    lowConfidenceBlocksPercent: Math.round((lowConfBlocks / blocks.length) * 100),
    averageFontSize: estimatedFontSize,
    detectedTitles,
  };
}

/**
 * Quick OCR using only Google Vision (for speed when quality is less critical)
 */
export async function quickOCR(imageBuffer: Buffer): Promise<OCREngineResult> {
  return runGoogleVision(imageBuffer);
}

/**
 * Thorough OCR using all available engines (for maximum accuracy)
 */
export async function thoroughOCR(imageBuffer: Buffer): Promise<OrchestratedOCRResult> {
  return orchestrateOCR(imageBuffer, {
    engines: ['google-vision', 'tesseract'],
    runParallel: true,
    preprocess: true,
    preferEngine: 'best',
  });
}

