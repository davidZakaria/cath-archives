// AI Agent for text correction, formatting, and metadata extraction using GPT-4
import OpenAI from 'openai';
import { FormattedArticle, ArticleMetadata, Dialogue } from '@/types';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({ apiKey });
};

// System prompt for Arabic cinema archive processing
const SYSTEM_PROMPT = `You are an expert Arabic text analyst specializing in historical cinema archives from Arabic magazines and newspapers. Your task is to:

1. CORRECT OCR errors in Arabic text while preserving the original meaning
2. IDENTIFY and FORMAT the text structure (titles, body, dialogues, credits)
3. EXTRACT metadata about movies and characters mentioned

Rules:
- Maintain the original Arabic text style and era-appropriate language
- Fix common OCR errors in Arabic (ء/ئ confusion, ة/ه confusion, etc.)
- Identify movie titles (usually in quotes or distinctive formatting)
- Identify actor/character names
- Separate dialogue sections from narrative text
- Preserve any dates or publication information

Output ONLY valid JSON with no additional text.`;

export interface AIProcessingResult {
  correctedText: string;
  formattedContent: FormattedArticle;
  metadata: ArticleMetadata;
  confidence: number;
}

// Main function to process a document with AI
export async function processDocumentWithAI(
  ocrText: string,
  documentId?: string
): Promise<AIProcessingResult> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Process this Arabic OCR text from a cinema archive. Return JSON with the structure:
{
  "correctedText": "full corrected Arabic text",
  "formattedContent": {
    "title": "article title if found",
    "subtitle": "subtitle if found",
    "body": "main article body",
    "dialogues": [{"speaker": "name", "text": "dialogue text"}],
    "credits": "any credits or attribution"
  },
  "metadata": {
    "movies": ["movie names mentioned"],
    "characters": ["actor/character names mentioned"],
    "publicationDate": "date if found",
    "source": "magazine/newspaper name if found"
  },
  "confidence": 0.0 to 1.0 indicating correction confidence
}

OCR Text:
${ocrText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent corrections
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from GPT-4');
    }

    const result = JSON.parse(content);
    
    // Validate and normalize the result
    return {
      correctedText: result.correctedText || ocrText,
      formattedContent: {
        title: result.formattedContent?.title || undefined,
        subtitle: result.formattedContent?.subtitle || undefined,
        body: result.formattedContent?.body || result.correctedText || ocrText,
        dialogues: normalizeDialogues(result.formattedContent?.dialogues),
        credits: result.formattedContent?.credits || undefined,
      },
      metadata: {
        movies: result.metadata?.movies || [],
        characters: result.metadata?.characters || [],
        publicationDate: result.metadata?.publicationDate || undefined,
        source: result.metadata?.source || undefined,
      },
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
    };
  } catch (error) {
    console.error(`AI processing failed for document ${documentId}:`, error);
    throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Correct OCR text only (lighter operation)
export async function correctOCRText(ocrText: string): Promise<string> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert in correcting Arabic OCR errors. Fix common errors while preserving meaning:
- ء/ئ/ؤ confusion
- ة/ه confusion
- ى/ي confusion
- Word spacing issues
- Diacritics restoration where obvious
Return ONLY the corrected Arabic text with no explanations.`,
        },
        {
          role: 'user',
          content: ocrText,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content || ocrText;
  } catch (error) {
    console.error('OCR correction failed:', error);
    return ocrText; // Return original if correction fails
  }
}

// Extract article structure from text
export async function formatArticle(text: string): Promise<FormattedArticle> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Extract the structure from this Arabic cinema article. Return JSON:
{
  "title": "main title",
  "subtitle": "subtitle if present",
  "body": "main article content",
  "dialogues": [{"speaker": "name", "text": "what they said"}],
  "credits": "any attribution/credits"
}
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { body: text };

    const result = JSON.parse(content);
    return {
      title: result.title,
      subtitle: result.subtitle,
      body: result.body || text,
      dialogues: normalizeDialogues(result.dialogues),
      credits: result.credits,
    };
  } catch (error) {
    console.error('Article formatting failed:', error);
    return { body: text };
  }
}

// Extract metadata (movies, characters, dates)
export async function extractMetadata(text: string): Promise<ArticleMetadata> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Extract metadata from this Arabic cinema article. Return JSON:
{
  "movies": ["list of movie titles mentioned"],
  "characters": ["list of actor/director/character names"],
  "publicationDate": "date if found (YYYY-MM-DD format)",
  "source": "magazine or newspaper name if mentioned"
}
Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return {};

    return JSON.parse(content);
  } catch (error) {
    console.error('Metadata extraction failed:', error);
    return {};
  }
}

// Helper to normalize dialogues array
function normalizeDialogues(dialogues: unknown): Dialogue[] {
  if (!Array.isArray(dialogues)) return [];
  
  return dialogues
    .filter((d): d is { speaker?: string; text: string } => 
      typeof d === 'object' && d !== null && typeof (d as { text?: unknown }).text === 'string'
    )
    .map((d) => ({
      speaker: d.speaker,
      text: d.text,
    }));
}

// Batch process multiple documents (with rate limiting)
export async function batchProcessDocuments(
  documents: Array<{ id: string; ocrText: string }>,
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, AIProcessingResult>> {
  const results = new Map<string, AIProcessingResult>();
  const total = documents.length;
  
  // Process in batches of 3 to respect rate limits
  const batchSize = 3;
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          const result = await processDocumentWithAI(doc.ocrText, doc.id);
          return { id: doc.id, result, success: true };
        } catch (error) {
          console.error(`Failed to process document ${doc.id}:`, error);
          return { id: doc.id, result: null, success: false };
        }
      })
    );
    
    for (const { id, result, success } of batchResults) {
      if (success && result) {
        results.set(id, result);
      }
    }
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }
    
    // Rate limiting delay between batches
    if (i + batchSize < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// Estimate cost for processing documents
export function estimateProcessingCost(documentCount: number, avgTextLength: number = 2000): {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
} {
  // Rough token estimation: ~4 chars per token for Arabic
  const avgInputTokens = Math.ceil(avgTextLength / 4) + 500; // +500 for system prompt
  const avgOutputTokens = Math.ceil(avgTextLength / 4) + 200; // +200 for JSON structure
  
  const totalInputTokens = avgInputTokens * documentCount;
  const totalOutputTokens = avgOutputTokens * documentCount;
  
  // GPT-4 Turbo pricing (as of 2024): $10/1M input, $30/1M output
  const inputCost = (totalInputTokens / 1000000) * 10;
  const outputCost = (totalOutputTokens / 1000000) * 30;
  
  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    estimatedCost: Math.round((inputCost + outputCost) * 100) / 100,
  };
}
