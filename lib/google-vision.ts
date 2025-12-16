// Google Cloud Vision API integration for OCR with enhanced accuracy
import vision from '@google-cloud/vision';
import { OCRBlock, EnhancedOCRResult } from '@/types';
import { formatOCRTextAdvanced } from './text-formatter';

// Initialize the Vision API client
const getVisionClient = () => {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (apiKey) {
    return new vision.ImageAnnotatorClient({
      apiKey: apiKey,
    });
  } else if (credentials) {
    return new vision.ImageAnnotatorClient({
      keyFilename: credentials,
    });
  } else {
    return new vision.ImageAnnotatorClient();
  }
};

interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  accuracyMetrics?: {
    overallConfidence: number;
    highConfidenceBlocksPercent: number;
    lowConfidenceBlocksPercent: number;
    averageFontSize: number;
    detectedTitles: string[];
  };
}

// Calculate estimated font size from bounding box and word count
function estimateFontSize(block: { height: number; text: string }): number {
  const lineCount = Math.max(1, block.text.split('\n').length);
  const estimatedLineHeight = block.height / lineCount;
  // Font size is roughly 70-80% of line height
  return Math.round(estimatedLineHeight * 0.75);
}

// Classify block type based on font size relative to document average
function classifyBlockType(
  fontSize: number,
  avgFontSize: number,
  wordCount: number
): 'title' | 'subtitle' | 'heading' | 'body' | 'caption' {
  const sizeRatio = fontSize / avgFontSize;
  
  if (sizeRatio >= 1.8 && wordCount <= 10) return 'title';
  if (sizeRatio >= 1.4 && wordCount <= 15) return 'subtitle';
  if (sizeRatio >= 1.2 && wordCount <= 20) return 'heading';
  if (sizeRatio <= 0.8) return 'caption';
  return 'body';
}

export async function performOCR(imagePath: string): Promise<OCRResult> {
  try {
    const client = getVisionClient();
    
    // Perform text detection with language hints for Arabic
    const [result] = await client.documentTextDetection({
      image: { source: { filename: imagePath } },
      imageContext: {
        languageHints: ['ar'], // Arabic language hint
      },
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      return {
        text: '',
        confidence: 0,
        blocks: [],
      };
    }

    // Extract full text
    const text = fullTextAnnotation.text;

    // Calculate overall confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    const blocks: OCRBlock[] = [];

    // Process each page (usually one page per image)
    if (fullTextAnnotation.pages) {
      for (const page of fullTextAnnotation.pages) {
        if (page.blocks) {
          for (const block of page.blocks) {
            // Get block text
            let blockText = '';
            if (block.paragraphs) {
              for (const paragraph of block.paragraphs) {
                if (paragraph.words) {
                  for (const word of paragraph.words) {
                    if (word.symbols) {
                      for (const symbol of word.symbols) {
                        blockText += symbol.text || '';
                      }
                      blockText += ' ';
                    }
                  }
                }
              }
            }

            // Get bounding box
            const vertices = block.boundingBox?.vertices || [];
            if (vertices.length >= 2) {
              const x = vertices[0].x || 0;
              const y = vertices[0].y || 0;
              const width = (vertices[1].x || 0) - x;
              const height = (vertices[2].y || 0) - y;

              // Get confidence
              const confidence = block.confidence || 0;
              totalConfidence += confidence;
              confidenceCount++;

              blocks.push({
                text: blockText.trim(),
                confidence: confidence,
                boundingBox: { x, y, width, height },
              });
            }
          }
        }
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Apply intelligent formatting to the text
    const formattedText = formatOCRText(blocks, text);

    return {
      text: formattedText, // Use formatted text with structure
      confidence: avgConfidence,
      blocks: blocks,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function performOCRFromBuffer(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    const client = getVisionClient();
    
    // Enhanced OCR with document text detection (better for magazines/documents)
    // Using DOCUMENT_TEXT_DETECTION for maximum accuracy with printed text
    const [result] = await client.documentTextDetection({
      image: { content: imageBuffer },
      imageContext: {
        languageHints: ['ar', 'ar-EG'], // Arabic + Egyptian Arabic for cinema content
      },
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      return {
        text: '',
        confidence: 0,
        blocks: [],
        accuracyMetrics: {
          overallConfidence: 0,
          highConfidenceBlocksPercent: 0,
          lowConfidenceBlocksPercent: 100,
          averageFontSize: 0,
          detectedTitles: [],
        },
      };
    }

    const text = fullTextAnnotation.text;

    let totalConfidence = 0;
    let confidenceCount = 0;
    let highConfidenceBlocks = 0;
    let lowConfidenceBlocks = 0;
    const blocks: OCRBlock[] = [];
    const fontSizes: number[] = [];

    if (fullTextAnnotation.pages) {
      for (const page of fullTextAnnotation.pages) {
        if (page.blocks) {
          for (const block of page.blocks) {
            let blockText = '';
            let wordConfidenceSum = 0;
            let wordCount = 0;
            
            if (block.paragraphs) {
              for (const paragraph of block.paragraphs) {
                if (paragraph.words) {
                  for (const word of paragraph.words) {
                    // Get word-level confidence for better accuracy tracking
                    if (word.confidence) {
                      wordConfidenceSum += word.confidence;
                      wordCount++;
                    }
                    if (word.symbols) {
                      for (const symbol of word.symbols) {
                        blockText += symbol.text || '';
                      }
                      blockText += ' ';
                    }
                  }
                }
              }
            }

            const vertices = block.boundingBox?.vertices || [];
            if (vertices.length >= 4) {
              const x = vertices[0].x || 0;
              const y = vertices[0].y || 0;
              const width = Math.abs((vertices[1].x || 0) - x);
              const height = Math.abs((vertices[2].y || 0) - y);
              
              // Use word-level confidence if available, otherwise block confidence
              const confidence = wordCount > 0 
                ? wordConfidenceSum / wordCount 
                : (block.confidence || 0);
              
              totalConfidence += confidence;
              confidenceCount++;
              
              // Track high/low confidence blocks (threshold: 80%)
              if (confidence >= 0.80) {
                highConfidenceBlocks++;
              } else if (confidence < 0.60) {
                lowConfidenceBlocks++;
              }

              // Estimate font size from block height
              const estimatedSize = estimateFontSize({ 
                height, 
                text: blockText.trim() 
              });
              fontSizes.push(estimatedSize);

              blocks.push({
                text: blockText.trim(),
                confidence: confidence,
                boundingBox: { x, y, width, height },
                estimatedFontSize: estimatedSize,
              });
            }
          }
        }
      }
    }

    // Calculate average font size for block classification
    const avgFontSize = fontSizes.length > 0 
      ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length 
      : 16;

    // Classify blocks and detect titles
    const detectedTitles: string[] = [];
    for (const block of blocks) {
      const wordCount = block.text.split(/\s+/).length;
      block.blockType = classifyBlockType(
        block.estimatedFontSize || avgFontSize,
        avgFontSize,
        wordCount
      );
      
      if (block.blockType === 'title' || block.blockType === 'subtitle') {
        detectedTitles.push(block.text);
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const totalBlocks = confidenceCount || 1;

    // Apply advanced formatting with font size awareness
    const formattedText = formatOCRTextAdvanced(blocks, text);

    return {
      text: formattedText,
      confidence: avgConfidence,
      blocks: blocks,
      accuracyMetrics: {
        overallConfidence: Math.round(avgConfidence * 100),
        highConfidenceBlocksPercent: Math.round((highConfidenceBlocks / totalBlocks) * 100),
        lowConfidenceBlocksPercent: Math.round((lowConfidenceBlocks / totalBlocks) * 100),
        averageFontSize: Math.round(avgFontSize),
        detectedTitles: detectedTitles.slice(0, 3), // Top 3 titles
      },
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
