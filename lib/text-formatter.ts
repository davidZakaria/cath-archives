// Intelligent text formatting for OCR output with font-size based title detection
import { OCRBlock } from '@/types';

interface FormattedSection {
  type: 'title' | 'subtitle' | 'paragraph' | 'dialogue' | 'list' | 'heading' | 'caption';
  text: string;
  confidence: number;
  fontSize?: number;
}

// Standard formatting (backwards compatible)
export function formatOCRText(blocks: OCRBlock[], fullText: string): string {
  if (!blocks || blocks.length === 0) {
    return fullText;
  }

  // Sort blocks by vertical position (top to bottom)
  const sortedBlocks = [...blocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y);

  // Analyze blocks and determine their type
  const sections: FormattedSection[] = [];
  
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    
    const blockType = detectBlockType(block, i, sortedBlocks);
    
    sections.push({
      type: blockType,
      text: block.text.trim(),
      confidence: block.confidence,
    });
  }

  // Format the sections into structured text
  return formatSections(sections);
}

// Advanced formatting using font-size detection
export function formatOCRTextAdvanced(blocks: OCRBlock[], fullText: string): string {
  if (!blocks || blocks.length === 0) {
    return fullText;
  }

  // Sort blocks by vertical position (top to bottom), then left to right
  const sortedBlocks = [...blocks].sort((a, b) => {
    const yDiff = a.boundingBox.y - b.boundingBox.y;
    if (Math.abs(yDiff) < 20) { // Same line threshold
      return a.boundingBox.x - b.boundingBox.x; // Sort by x if on same line
    }
    return yDiff;
  });

  // Group blocks into lines (blocks on same horizontal level)
  const lines = groupBlocksIntoLines(sortedBlocks);
  
  // Build formatted output
  const sections: FormattedSection[] = [];
  
  for (const lineBlocks of lines) {
    // Combine text from blocks on same line
    const lineText = lineBlocks.map(b => b.text.trim()).join(' ').trim();
    if (!lineText) continue;
    
    // Use the block type from font-size analysis if available
    const primaryBlock = lineBlocks.reduce((largest, block) => 
      (block.estimatedFontSize || 0) > (largest.estimatedFontSize || 0) ? block : largest
    );
    
    const sectionType = mapBlockTypeToSection(primaryBlock.blockType);
    
    sections.push({
      type: sectionType,
      text: lineText,
      confidence: primaryBlock.confidence,
      fontSize: primaryBlock.estimatedFontSize,
    });
  }

  return formatSectionsAdvanced(sections);
}

// Group blocks that are on the same horizontal line
function groupBlocksIntoLines(blocks: OCRBlock[]): OCRBlock[][] {
  const lines: OCRBlock[][] = [];
  let currentLine: OCRBlock[] = [];
  let lastY = -1000;
  const lineThreshold = 30; // Pixels threshold for same line
  
  for (const block of blocks) {
    if (lastY === -1000 || Math.abs(block.boundingBox.y - lastY) < lineThreshold) {
      currentLine.push(block);
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [block];
    }
    lastY = block.boundingBox.y;
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Map block type from font analysis to section type
function mapBlockTypeToSection(
  blockType?: 'title' | 'subtitle' | 'heading' | 'body' | 'caption'
): 'title' | 'subtitle' | 'paragraph' | 'dialogue' | 'list' | 'heading' | 'caption' {
  switch (blockType) {
    case 'title': return 'title';
    case 'subtitle': return 'subtitle';
    case 'heading': return 'heading';
    case 'caption': return 'caption';
    case 'body':
    default:
      return 'paragraph';
  }
}

// Advanced section formatting with better visual hierarchy
function formatSectionsAdvanced(sections: FormattedSection[]): string {
  let formatted = '';
  let hasTitle = false;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const text = section.text.trim();
    
    if (!text) continue;
    
    switch (section.type) {
      case 'title':
        // Only mark first title as main title
        if (!hasTitle) {
          formatted += `# ${text}\n\n`;
          hasTitle = true;
        } else {
          formatted += `## ${text}\n\n`;
        }
        break;
        
      case 'subtitle':
        formatted += `## ${text}\n\n`;
        break;
        
      case 'heading':
        formatted += `### ${text}\n\n`;
        break;
        
      case 'caption':
        formatted += `*${text}*\n\n`;
        break;
        
      case 'dialogue':
        formatted += `> ${text}\n\n`;
        break;
        
      case 'list':
        formatted += `• ${text}\n`;
        break;
        
      case 'paragraph':
      default:
        formatted += `${text}\n\n`;
        break;
    }
  }
  
  // Clean up excessive line breaks
  return formatted
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function detectBlockType(
  block: OCRBlock, 
  index: number, 
  allBlocks: OCRBlock[]
): 'title' | 'subtitle' | 'paragraph' | 'dialogue' | 'list' {
  const text = block.text.trim();
  const wordCount = text.split(/\s+/).length;
  const avgBlockSize = allBlocks.reduce((sum, b) => sum + b.boundingBox.height, 0) / allBlocks.length;
  
  // Title detection: First block, short text (1-8 words), or larger than average
  if (index === 0 && wordCount <= 8) {
    return 'title';
  }
  
  // Larger text than average (likely a heading)
  if (block.boundingBox.height > avgBlockSize * 1.3 && wordCount <= 15) {
    return 'title';
  }
  
  // Subtitle detection: Second or third block, moderate length (3-12 words)
  if (index <= 2 && wordCount >= 3 && wordCount <= 12 && block.boundingBox.height > avgBlockSize * 1.1) {
    return 'subtitle';
  }
  
  // Dialogue detection: Indented text or quoted text
  const isIndented = block.boundingBox.x > (allBlocks[0]?.boundingBox.x || 0) + 20;
  const hasDialogueMarkers = /[«»""''":]/g.test(text);
  
  if (isIndented || hasDialogueMarkers) {
    return 'dialogue';
  }
  
  // List detection: Starts with numbers or bullets
  if (/^[\d\u0660-\u0669]+[.\-\):]/.test(text) || /^[•\-\*]/.test(text)) {
    return 'list';
  }
  
  // Default to paragraph
  return 'paragraph';
}

function formatSections(sections: FormattedSection[]): string {
  let formatted = '';
  let lastType: string | null = null;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];
    
    // Add appropriate formatting based on type
    switch (section.type) {
      case 'title':
        formatted += `\n# ${section.text}\n\n`;
        break;
        
      case 'subtitle':
        formatted += `## ${section.text}\n\n`;
        break;
        
      case 'dialogue':
        formatted += `> ${section.text}\n\n`;
        break;
        
      case 'list':
        formatted += `• ${section.text}\n`;
        // Don't add extra line break if next item is also a list
        if (nextSection && nextSection.type !== 'list') {
          formatted += '\n';
        }
        break;
        
      case 'paragraph':
      default:
        formatted += `${section.text}\n\n`;
        break;
    }
    
    lastType = section.type;
  }
  
  // Clean up: remove excessive line breaks
  formatted = formatted
    .replace(/\n{4,}/g, '\n\n\n') // Max 2 line breaks
    .trim();
  
  return formatted;
}

// Alternative simpler formatting (preserves original structure better)
export function formatOCRTextSimple(blocks: OCRBlock[], fullText: string): string {
  if (!blocks || blocks.length === 0) {
    return fullText;
  }

  // Sort blocks by vertical position
  const sortedBlocks = [...blocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  
  let formatted = '';
  let previousY = 0;
  
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];
    const text = block.text.trim();
    
    if (!text) continue;
    
    // Calculate vertical gap from previous block
    const verticalGap = block.boundingBox.y - previousY;
    const avgHeight = block.boundingBox.height;
    
    // Add extra spacing for large gaps (new sections)
    if (i > 0 && verticalGap > avgHeight * 1.5) {
      formatted += '\n\n---\n\n'; // Section divider
    } else if (i > 0) {
      formatted += '\n\n'; // Normal paragraph break
    }
    
    // Detect if it's likely a title (first block or short text)
    if (i === 0 && text.split(/\s+/).length <= 10) {
      formatted += `# ${text}`;
    } else {
      formatted += text;
    }
    
    previousY = block.boundingBox.y + block.boundingBox.height;
  }
  
  return formatted.trim();
}

