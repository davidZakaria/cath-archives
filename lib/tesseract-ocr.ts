// Tesseract.js OCR integration (Free, no API key needed)
import Tesseract from 'tesseract.js';
import { OCRBlock } from '@/types';

interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export async function performTesseractOCR(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    console.log('Starting Tesseract OCR for Arabic text...');
    
    // Perform OCR directly without worker (simpler, works better in Node.js)
    const result = await Tesseract.recognize(
      imageBuffer,
      'ara', // Arabic language
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      }
    );

    const data = result.data;
    
    // Extract blocks with confidence scores and bounding boxes
    const blocks: OCRBlock[] = [];
    
    if (data.blocks) {
      for (const block of data.blocks) {
        if (block.text && block.text.trim()) {
          blocks.push({
            text: block.text,
            confidence: block.confidence / 100, // Convert to 0-1 range
            boundingBox: {
              x: block.bbox.x0,
              y: block.bbox.y0,
              width: block.bbox.x1 - block.bbox.x0,
              height: block.bbox.y1 - block.bbox.y0,
            },
          });
        }
      }
    }

    // Calculate overall confidence
    const avgConfidence = data.confidence / 100; // Convert to 0-1 range

    console.log(`Tesseract OCR completed!`);
    console.log(`- Text length: ${data.text.length} characters`);
    console.log(`- Confidence: ${Math.round(avgConfidence * 100)}%`);
    console.log(`- Blocks found: ${blocks.length}`);

    return {
      text: data.text,
      confidence: avgConfidence,
      blocks: blocks,
    };
  } catch (error) {
    console.error('Tesseract OCR Error:', error);
    throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

