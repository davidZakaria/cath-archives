// Duplicate page detection for collections
// Uses text similarity to detect repeated/duplicate pages

/**
 * Calculate similarity between two texts using Jaccard similarity
 * Works well for Arabic text comparison
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  // Normalize texts - remove diacritics and extra whitespace
  const normalize = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };
  
  const normalizedText1 = normalize(text1);
  const normalizedText2 = normalize(text2);
  
  // If texts are identical
  if (normalizedText1 === normalizedText2) return 1;
  
  // Create word sets
  const words1 = new Set(normalizedText1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizedText2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Calculate Jaccard similarity: |intersection| / |union|
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate similarity using n-gram approach (more accurate for OCR text)
 */
export function calculateNGramSimilarity(text1: string, text2: string, n: number = 3): number {
  if (!text1 || !text2) return 0;
  
  const getNGrams = (text: string, n: number): Set<string> => {
    const ngrams = new Set<string>();
    const normalized = text.replace(/\s+/g, '');
    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.slice(i, i + n));
    }
    return ngrams;
  };
  
  const ngrams1 = getNGrams(text1, n);
  const ngrams2 = getNGrams(text2, n);
  
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
}

export interface DuplicateResult {
  pageIndex1: number;
  pageIndex2: number;
  documentId1: string;
  documentId2: string;
  similarity: number;
  type: 'exact' | 'near-duplicate' | 'similar';
}

export interface PageForDetection {
  documentId: string;
  pageIndex: number;
  ocrText: string;
}

/**
 * Detect duplicate pages in a collection
 * Returns pairs of pages that are duplicates or near-duplicates
 */
export function detectDuplicatePages(
  pages: PageForDetection[],
  options: {
    exactThreshold?: number;      // >= this = exact duplicate (default 0.95)
    nearDuplicateThreshold?: number; // >= this = near duplicate (default 0.80)
    similarThreshold?: number;    // >= this = similar (default 0.60)
  } = {}
): DuplicateResult[] {
  const {
    exactThreshold = 0.95,
    nearDuplicateThreshold = 0.80,
    similarThreshold = 0.60,
  } = options;
  
  const duplicates: DuplicateResult[] = [];
  
  // Compare each pair of pages
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const page1 = pages[i];
      const page2 = pages[j];
      
      // Skip if either page has no text
      if (!page1.ocrText || !page2.ocrText) continue;
      
      // Calculate similarity using both methods and take the higher one
      const jaccardSim = calculateTextSimilarity(page1.ocrText, page2.ocrText);
      const ngramSim = calculateNGramSimilarity(page1.ocrText, page2.ocrText);
      const similarity = Math.max(jaccardSim, ngramSim);
      
      // Classify the duplicate type
      let type: 'exact' | 'near-duplicate' | 'similar' | null = null;
      
      if (similarity >= exactThreshold) {
        type = 'exact';
      } else if (similarity >= nearDuplicateThreshold) {
        type = 'near-duplicate';
      } else if (similarity >= similarThreshold) {
        type = 'similar';
      }
      
      if (type) {
        duplicates.push({
          pageIndex1: page1.pageIndex,
          pageIndex2: page2.pageIndex,
          documentId1: page1.documentId,
          documentId2: page2.documentId,
          similarity,
          type,
        });
      }
    }
  }
  
  // Sort by similarity (highest first)
  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get suggested pages to remove (keep the first occurrence, suggest removing duplicates)
 */
export function getSuggestedRemovals(duplicates: DuplicateResult[]): string[] {
  const toRemove = new Set<string>();
  const kept = new Set<string>();
  
  for (const dup of duplicates) {
    // If page1 is not already marked for removal and not kept, keep it
    if (!toRemove.has(dup.documentId1) && !kept.has(dup.documentId1)) {
      kept.add(dup.documentId1);
    }
    
    // If page2 is already kept, don't remove it
    if (!kept.has(dup.documentId2)) {
      toRemove.add(dup.documentId2);
    }
  }
  
  return Array.from(toRemove);
}

/**
 * Group duplicate chains (pages that are all duplicates of each other)
 */
export function groupDuplicateChains(duplicates: DuplicateResult[]): string[][] {
  const groups: Map<string, Set<string>> = new Map();
  
  for (const dup of duplicates) {
    const existingGroup1 = [...groups.entries()].find(([, members]) => 
      members.has(dup.documentId1) || members.has(dup.documentId2)
    );
    
    if (existingGroup1) {
      existingGroup1[1].add(dup.documentId1);
      existingGroup1[1].add(dup.documentId2);
    } else {
      const groupId = dup.documentId1;
      groups.set(groupId, new Set([dup.documentId1, dup.documentId2]));
    }
  }
  
  return [...groups.values()].map(set => Array.from(set));
}

