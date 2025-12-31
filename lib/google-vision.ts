// Google Cloud Vision API integration for OCR with enhanced accuracy
import vision from '@google-cloud/vision';
import sharp from 'sharp';
import { OCRBlock, EnhancedOCRResult } from '@/types';
import { formatOCRTextAdvanced } from './text-formatter';
import { detectColumns, splitColumns } from './image-preprocessing';

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
    const formattedText = formatOCRTextAdvanced(blocks, text);

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

export async function performOCRFromBuffer(
  imageBuffer: Buffer,
  options?: { manualColumnCount?: number; processColumns?: boolean }
): Promise<OCRResult> {
  try {
    const client = getVisionClient();

    // Detect columns if enabled
    let numColumns = 1;
    let imageWidth = 0;
    let shouldProcessColumns = options?.processColumns !== false; // Default to true

    console.log(`[OCR Pipeline] Starting OCR, column processing enabled: ${shouldProcessColumns}`);

    if (shouldProcessColumns) {
      const columnDetection = await detectColumns(imageBuffer, options?.manualColumnCount);
      console.log(`[OCR Pipeline] Column detection:`, {
        hasColumns: columnDetection.hasColumns,
        estimatedColumns: columnDetection.estimatedColumns,
        confidence: columnDetection.confidence
      });

      if (columnDetection.hasColumns && columnDetection.estimatedColumns > 1) {
        numColumns = columnDetection.estimatedColumns;
        const metadata = await sharp(imageBuffer).metadata();
        imageWidth = metadata.width || 0;
        console.log(`[OCR Pipeline] Multi-column detected: ${numColumns} columns, width: ${imageWidth}px`);
      } else {
        console.log(`[OCR Pipeline] Single column mode`);
      }
    }

    // If columns detected, process each column separately
    if (numColumns > 1 && imageWidth > 0) {
      console.log(`[OCR Pipeline] ✓ Using MULTI-COLUMN processing for ${numColumns} columns`);
      return await processMultiColumnOCR(imageBuffer, numColumns, imageWidth, client);
    }

    console.log(`[OCR Pipeline] ✓ Using SINGLE-COLUMN processing`);

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
              // Get all Y coordinates to find the topmost point
              const yCoords = vertices.map(v => v.y || 0).filter(y => y !== undefined);
              const xCoords = vertices.map(v => v.x || 0).filter(x => x !== undefined);

              // Top-left corner (for Arabic RTL, this is top-right)
              const x = Math.min(...xCoords);
              const y = Math.min(...yCoords); // Topmost Y coordinate
              const width = Math.max(...xCoords) - Math.min(...xCoords);
              const height = Math.max(...yCoords) - Math.min(...yCoords);

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

    // Sort blocks by Y position (top to bottom) before classification
    // This ensures title detection uses the correct first block (top of document)
    const sortedBlocksForClassification = [...blocks].sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) < 20) {
        // Same line: sort by X (right to left for Arabic)
        return b.boundingBox.x - a.boundingBox.x;
      }
      return yDiff; // Top to bottom
    });

    // Calculate document bounds for title detection
    const minY = blocks.length > 0 ? Math.min(...blocks.map(b => b.boundingBox.y)) : 0;
    const maxY = blocks.length > 0 ? Math.max(...blocks.map(b => b.boundingBox.y + b.boundingBox.height)) : 0;
    const documentHeight = maxY - minY;
    const topThreshold = documentHeight * 0.15; // Top 15% of document

    // Classify blocks and detect titles (using sorted order - top blocks first)
    const detectedTitles: string[] = [];
    for (let i = 0; i < sortedBlocksForClassification.length; i++) {
      const block = sortedBlocksForClassification[i];
      const wordCount = block.text.split(/\s+/).length;
      const blockType = classifyBlockType(
        block.estimatedFontSize || avgFontSize,
        avgFontSize,
        wordCount
      );

      // Update the block type in the original blocks array
      block.blockType = blockType;

      // Only consider blocks at the top of the document as potential titles
      const isTopBlock = (block.boundingBox.y - minY) < topThreshold;

      if ((blockType === 'title' || blockType === 'subtitle') && isTopBlock) {
        detectedTitles.push(block.text);
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    const totalBlocks = confidenceCount || 1;

    // Sort blocks by Y position (top to bottom) before formatting
    // This ensures correct reading order and title detection
    // CRITICAL: Build text from sorted blocks, not from Google's fullText which may be in wrong order

    // Sort by Y ascending (smaller Y = top of page)
    let sortedBlocks = [...blocks].sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) < 20) {
        // Same line: sort by X (right to left for Arabic)
        return b.boundingBox.x - a.boundingBox.x;
      }
      return yDiff; // Top to bottom (smaller Y = top of page)
    });

    // Verify: if first block has larger Y than last block after sorting, reverse
    if (sortedBlocks.length > 1) {
      const firstY = sortedBlocks[0].boundingBox.y;
      const lastY = sortedBlocks[sortedBlocks.length - 1].boundingBox.y;
      if (firstY > lastY) {
        console.warn(`[OCR Sorting] WARNING: After sorting, first block Y (${firstY}) > last block Y (${lastY}). Reversing order.`);
        sortedBlocks = sortedBlocks.reverse();
      }
    }

    // Debug: Log first and last few blocks to verify sorting
    if (sortedBlocks.length > 0) {
      console.log(`[OCR Sorting] Total blocks: ${sortedBlocks.length}`);
      const firstBlock = sortedBlocks[0];
      const lastBlock = sortedBlocks[sortedBlocks.length - 1];
      console.log(`[OCR Sorting] First block: Y=${firstBlock.boundingBox.y}, X=${firstBlock.boundingBox.x}, Text="${firstBlock.text.substring(0, 80)}..."`);
      if (sortedBlocks.length > 1) {
        console.log(`[OCR Sorting] Last block: Y=${lastBlock.boundingBox.y}, X=${lastBlock.boundingBox.x}, Text="${lastBlock.text.substring(0, 80)}..."`);
      }
      // Log a few middle blocks too
      if (sortedBlocks.length > 4) {
        const midBlock = sortedBlocks[Math.floor(sortedBlocks.length / 2)];
        console.log(`[OCR Sorting] Middle block: Y=${midBlock.boundingBox.y}, X=${midBlock.boundingBox.x}, Text="${midBlock.text.substring(0, 80)}..."`);
      }
      // Verify Y coordinates are increasing (top to bottom)
      const yValues = sortedBlocks.map(b => b.boundingBox.y);
      const isAscending = yValues.every((y, i) => i === 0 || y >= yValues[i - 1]);
      const isDescending = yValues.every((y, i) => i === 0 || y <= yValues[i - 1]);
      console.log(`[OCR Sorting] Y coordinates ascending: ${isAscending}, descending: ${isDescending} (first Y: ${yValues[0]}, last Y: ${yValues[yValues.length - 1]})`);

      // If Y coordinates are descending (last block has smaller Y), the coordinate system might be inverted
      // Reverse the sort in this case
      if (isDescending && !isAscending && sortedBlocks.length > 1) {
        console.warn(`[OCR Sorting] WARNING: Y coordinates are descending! Reversing sort order.`);
        sortedBlocks.reverse();
      }
    }

    // Build text from sorted blocks to ensure correct order
    // Don't use Google's fullText as it may not respect our sorting
    // Preserve line breaks by detecting when blocks are on different Y levels
    let textFromBlocks = '';
    let lastY = -1;
    for (let i = 0; i < sortedBlocks.length; i++) {
      const block = sortedBlocks[i];
      const blockText = block.text.trim();
      if (!blockText) continue;

      // If this block is significantly lower than the previous one, add a space
      // (blocks on same line will be joined with space, different lines also with space for now)
      if (i > 0 && lastY >= 0) {
        const yDiff = block.boundingBox.y - lastY;
        if (Math.abs(yDiff) > 30) {
          // Different line - add space
          textFromBlocks += ' ';
        } else {
          // Same line - add space
          textFromBlocks += ' ';
        }
      }
      textFromBlocks += blockText;
      lastY = block.boundingBox.y;
    }

    // Apply advanced formatting with font size awareness (using sorted blocks)
    const metadata = await sharp(imageBuffer).metadata();

    // If columns are detected, use the formatter which handles column arrangement
    // Otherwise, use the text we built from sorted blocks directly (to preserve order)
    let formattedText: string;
    if (numColumns && numColumns > 1 && metadata.width) {
      // For multi-column: use formatter to arrange by column
      formattedText = formatOCRTextAdvanced(sortedBlocks, textFromBlocks, metadata.width, numColumns);
    } else {
      // For single column: use the text we built from sorted blocks directly
      // This ensures the order is exactly as we sorted it (top to bottom)
      formattedText = textFromBlocks;
    }

    // Update blocks array to be sorted for consistency
    blocks.length = 0;
    blocks.push(...sortedBlocks);

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

/**
 * Process multi-column document by splitting into columns and processing each separately
 * Columns are processed right-to-left (rightmost column first for Arabic)
 */
async function processMultiColumnOCR(
  imageBuffer: Buffer,
  numColumns: number,
  imageWidth: number,
  client: any
): Promise<OCRResult> {
  // Split image into columns (right-to-left for Arabic)
  // splitColumns returns: [rightmost, ..., leftmost] (column 0 = rightmost)
  const columnBuffers = await splitColumns(imageBuffer, numColumns);

  const columnTexts: Array<{ text: string; columnIndex: number; topY: number; blockCount: number }> = []; // Store text with metadata for ordering
  const allBlocks: OCRBlock[] = [];
  let totalConfidence = 0;
  let totalBlocks = 0;
  let highConfidenceBlocks = 0;
  let lowConfidenceBlocks = 0;
  const fontSizes: number[] = [];
  const detectedTitles: string[] = [];
  const columnWidth = imageWidth / numColumns;

  // Process each column separately (colIdx 0 = rightmost column = first for Arabic)
  console.log(`[Multi-Column OCR] Processing ${numColumns} columns, image width: ${imageWidth}, column width: ${columnWidth}`);
  for (let colIdx = 0; colIdx < columnBuffers.length; colIdx++) {
    const columnBuffer = columnBuffers[colIdx];
    const columnXOffset = (numColumns - 1 - colIdx) * columnWidth; // Right-to-left offset
    console.log(`[Multi-Column OCR] Column ${colIdx + 1} X offset: ${columnXOffset} (rightmost columns have higher offsets)`);
    const columnBlocks: OCRBlock[] = []; // Blocks for this column

    try {
      const [result] = await client.documentTextDetection({
        image: { content: columnBuffer },
        imageContext: {
          languageHints: ['ar', 'ar-EG'],
        },
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      if (!fullTextAnnotation || !fullTextAnnotation.pages) continue;

      // Process blocks from this column
      for (const page of fullTextAnnotation.pages) {
        if (!page.blocks) continue;

        for (const block of page.blocks) {
          let blockText = '';
          let wordConfidenceSum = 0;
          let wordCount = 0;

          if (block.paragraphs) {
            for (const paragraph of block.paragraphs) {
              if (paragraph.words) {
                for (const word of paragraph.words) {
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
            // Get all Y coordinates to find the topmost point
            const yCoords = vertices.map(v => v.y || 0).filter(y => y !== undefined);
            const xCoords = vertices.map(v => v.x || 0).filter(x => x !== undefined);

            // Top-left corner (adjusted for column offset)
            const x = Math.min(...xCoords) + columnXOffset;
            const y = Math.min(...yCoords); // Topmost Y coordinate
            const width = Math.max(...xCoords) - Math.min(...xCoords);
            const height = Math.max(...yCoords) - Math.min(...yCoords);

            const confidence = wordCount > 0
              ? wordConfidenceSum / wordCount
              : (block.confidence || 0);

            totalConfidence += confidence;
            totalBlocks++;

            if (confidence >= 0.80) {
              highConfidenceBlocks++;
            } else if (confidence < 0.60) {
              lowConfidenceBlocks++;
            }

            const estimatedSize = estimateFontSize({ height, text: blockText.trim() });
            fontSizes.push(estimatedSize);

            const blockObj = {
              text: blockText.trim(),
              confidence: confidence,
              boundingBox: { x, y, width, height },
              estimatedFontSize: estimatedSize,
            };

            columnBlocks.push(blockObj);
            allBlocks.push(blockObj);
          }
        }
      }

      // Sort blocks within this column by Y position (top to bottom)
      // For blocks on the same line, sort right-to-left (Arabic RTL)
      const sortedColumnBlocks = [...columnBlocks].sort((a, b) => {
        const yDiff = a.boundingBox.y - b.boundingBox.y;
        if (Math.abs(yDiff) < 20) {
          // Same line: sort by X (right to left for Arabic)
          return b.boundingBox.x - a.boundingBox.x;
        }
        // Different lines: sort by Y (top to bottom - smaller Y values first)
        return yDiff;
      });

      // Debug: Log first and last blocks to verify sorting
      if (sortedColumnBlocks.length > 0) {
        const colPosition = colIdx === 0 ? 'rightmost (FIRST)' : colIdx === columnBuffers.length - 1 ? 'leftmost (LAST)' : 'middle';
        console.log(`[Multi-Column OCR] Column ${colIdx + 1} (${colPosition}): ${sortedColumnBlocks.length} blocks`);
        console.log(`[Multi-Column OCR]   First block: Y=${sortedColumnBlocks[0].boundingBox.y}, Text="${sortedColumnBlocks[0].text.substring(0, 60)}..."`);
        if (sortedColumnBlocks.length > 1) {
          const lastIdx = sortedColumnBlocks.length - 1;
          console.log(`[Multi-Column OCR]   Last block: Y=${sortedColumnBlocks[lastIdx].boundingBox.y}, Text="${sortedColumnBlocks[lastIdx].text.substring(0, 60)}..."`);
        }
      }


      // Build column text from sorted blocks (already in correct top-to-bottom order)

      const sortedColumnText = sortedColumnBlocks
        .map(block => block.text.trim())
        .filter(text => text.length > 0)
        .join(' ');

      if (sortedColumnText.trim().length > 0) {
        // Store column info with its topmost Y coordinate for proper ordering
        const topY = sortedColumnBlocks.length > 0 ? sortedColumnBlocks[0].boundingBox.y : Infinity;
        columnTexts.push({
          text: sortedColumnText.trim(),
          columnIndex: colIdx,
          topY: topY,
          blockCount: sortedColumnBlocks.length
        });
        console.log(`[Multi-Column OCR] Column ${colIdx + 1} text length: ${sortedColumnText.length} chars, top Y: ${topY}`);
        console.log(`[Multi-Column OCR]   First 150 chars: "${sortedColumnText.substring(0, 150)}..."`);
      } else {
        console.log(`[Multi-Column OCR] Column ${colIdx + 1} is empty, skipping`);
      }
    } catch (error) {
      console.error(`Error processing column ${colIdx + 1}:`, error);
      // Continue with other columns
    }
  }

  // Calculate averages
  const avgFontSize = fontSizes.length > 0
    ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length
    : 16;

  const avgConfidence = totalBlocks > 0 ? totalConfidence / totalBlocks : 0;

  // Classify blocks and detect titles
  // Sort all blocks by Y position first, then by column (rightmost first)
  const sortedAllBlocks = [...allBlocks].sort((a, b) => {
    const yDiff = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(yDiff) < 50) {
      // Same approximate row: sort by column (rightmost first)
      // Rightmost column has higher X values
      return b.boundingBox.x - a.boundingBox.x;
    }
    return yDiff; // Top to bottom
  });

  for (const block of sortedAllBlocks) {
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

  // Combine column texts in strict right-to-left order for Arabic reading
  // Column 0 (rightmost) → Column 1 → ... → Column N-1 (leftmost)
  console.log(`[Multi-Column OCR] Combining ${columnTexts.length} columns in right-to-left order`);

  // Sort by TOP Y first (vertical position), then by columnIndex (right-to-left)
  // This ensures we read from top to bottom of page, right-to-left within each vertical band
  const sortedByIndex = [...columnTexts].sort((a, b) => {
    const yDiff = a.topY - b.topY;
    // If columns start at similar heights (within 200px), sort by columnIndex (0=rightmost first)
    if (Math.abs(yDiff) < 200) {
      return a.columnIndex - b.columnIndex;
    }
    // Otherwise, sort by Y position (top to bottom)
    return yDiff;
  });

  console.log(`[Multi-Column OCR] Column reading order (right-to-left):`);
  for (let i = 0; i < sortedByIndex.length; i++) {
    const col = sortedByIndex[i];
    const position = i === 0 ? 'rightmost (first)' : i === sortedByIndex.length - 1 ? 'leftmost (last)' : 'middle';
    console.log(`[Multi-Column OCR] ${i + 1}. Column ${col.columnIndex + 1} (${position}): top Y=${col.topY}, ${col.blockCount} blocks`);
    console.log(`[Multi-Column OCR]    First 80 chars: "${col.text.substring(0, 80)}..."`);
  }

  // Join columns in strict right-to-left order (no reordering)
  const formattedText = sortedByIndex.map(c => c.text).join('\n\n');

  // Debug: Log the final text to verify order
  console.log(`[Multi-Column OCR] Final text length: ${formattedText.length} characters`);
  console.log(`[Multi-Column OCR] First 100 chars: "${formattedText.substring(0, 100)}..."`);
  console.log(`[Multi-Column OCR] Last 100 chars: "${formattedText.substring(Math.max(0, formattedText.length - 100))}"`);

  // Ensure blocks are sorted top-to-bottom, then right-to-left for consistent ordering
  const finalSortedBlocks = [...sortedAllBlocks].sort((a, b) => {
    const yDiff = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(yDiff) < 20) {
      return b.boundingBox.x - a.boundingBox.x; // Right to left
    }
    return yDiff; // Top to bottom (smaller Y = top)
  });

  // Verify final block order
  if (finalSortedBlocks.length > 0) {
    const firstBlockY = finalSortedBlocks[0].boundingBox.y;
    const lastBlockY = finalSortedBlocks[finalSortedBlocks.length - 1].boundingBox.y;
    console.log(`[Multi-Column OCR] Final blocks: first Y=${firstBlockY}, last Y=${lastBlockY} (should be ascending)`);
    if (lastBlockY < firstBlockY) {
      console.warn(`[Multi-Column OCR] WARNING: Final blocks appear to be in reverse order!`);
    }
  }

  return {
    text: formattedText,
    confidence: avgConfidence,
    blocks: finalSortedBlocks, // Use sorted blocks instead of allBlocks
    accuracyMetrics: {
      overallConfidence: Math.round(avgConfidence * 100),
      highConfidenceBlocksPercent: Math.round((highConfidenceBlocks / totalBlocks) * 100),
      lowConfidenceBlocksPercent: Math.round((lowConfidenceBlocks / totalBlocks) * 100),
      averageFontSize: Math.round(avgFontSize),
      detectedTitles: detectedTitles.slice(0, 5), // More titles from multiple columns
    },
  };
}
