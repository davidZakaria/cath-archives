// AI Agent for text correction, formatting, and metadata extraction using GPT-4
import OpenAI from 'openai';
import { FormattedArticle, ArticleMetadata, Dialogue } from '@/types';

// Model options for different cost/accuracy trade-offs
export type AIModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo-preview';

export interface AIModelConfig {
  model: AIModel;
  inputCostPer1M: number;
  outputCostPer1M: number;
  description: string;
}

// Model configurations with pricing (as of Dec 2024)
export const AI_MODELS: Record<AIModel, AIModelConfig> = {
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    description: 'Most cost-effective - great for Arabic text correction (~100x cheaper than GPT-4)',
  },
  'gpt-4o': {
    model: 'gpt-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    description: 'Balanced - good accuracy at moderate cost',
  },
  'gpt-4-turbo-preview': {
    model: 'gpt-4-turbo-preview',
    inputCostPer1M: 10.00,
    outputCostPer1M: 30.00,
    description: 'Highest accuracy - most expensive',
  },
};

// Default to minimal cost model
const DEFAULT_MODEL: AIModel = 'gpt-4o-mini';

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
  modelUsed: AIModel;
  estimatedCost: number;
}

export interface ProcessingOptions {
  model?: AIModel;
  minimalCost?: boolean; // Shorthand for using gpt-4o-mini
}

// Main function to process a document with AI
export async function processDocumentWithAI(
  ocrText: string,
  documentId?: string,
  options: ProcessingOptions = {}
): Promise<AIProcessingResult> {
  const client = getOpenAIClient();
  
  // Use minimal cost model by default, or specified model
  const model: AIModel = options.model || (options.minimalCost !== false ? 'gpt-4o-mini' : DEFAULT_MODEL);
  const modelConfig = AI_MODELS[model];
  
  try {
    const response = await client.chat.completions.create({
      model: model,
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
      throw new Error(`Empty response from ${model}`);
    }

    const result = JSON.parse(content);
    
    // Calculate estimated cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const estimatedCost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;
    
    console.log(`[AI Agent] Model: ${model}, Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Cost: $${estimatedCost.toFixed(6)}`);
    
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
      modelUsed: model,
      estimatedCost: estimatedCost,
    };
  } catch (error) {
    console.error(`AI processing failed for document ${documentId}:`, error);
    throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Correct OCR text only (lighter operation) - uses minimal cost model by default
export async function correctOCRText(ocrText: string, model: AIModel = 'gpt-4o-mini'): Promise<{ text: string; cost: number }> {
  const client = getOpenAIClient();
  const modelConfig = AI_MODELS[model];
  
  try {
    const response = await client.chat.completions.create({
      model: model,
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

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;

    console.log(`[OCR Correction] Model: ${model}, Cost: $${cost.toFixed(6)}`);
    
    return { 
      text: response.choices[0]?.message?.content || ocrText,
      cost 
    };
  } catch (error) {
    console.error('OCR correction failed:', error);
    return { text: ocrText, cost: 0 }; // Return original if correction fails
  }
}

// Extract article structure from text - uses minimal cost model by default
export async function formatArticle(text: string, model: AIModel = 'gpt-4o-mini'): Promise<FormattedArticle & { cost: number }> {
  const client = getOpenAIClient();
  const modelConfig = AI_MODELS[model];
  
  try {
    const response = await client.chat.completions.create({
      model: model,
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

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;

    const content = response.choices[0]?.message?.content;
    if (!content) return { body: text, cost };

    const result = JSON.parse(content);
    return {
      title: result.title,
      subtitle: result.subtitle,
      body: result.body || text,
      dialogues: normalizeDialogues(result.dialogues),
      credits: result.credits,
      cost,
    };
  } catch (error) {
    console.error('Article formatting failed:', error);
    return { body: text, cost: 0 };
  }
}

// Extract metadata (movies, characters, dates) - uses minimal cost model by default
export async function extractMetadata(text: string, model: AIModel = 'gpt-4o-mini'): Promise<ArticleMetadata & { cost: number }> {
  const client = getOpenAIClient();
  const modelConfig = AI_MODELS[model];
  
  try {
    const response = await client.chat.completions.create({
      model: model,
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

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;

    const content = response.choices[0]?.message?.content;
    if (!content) return { cost };

    return { ...JSON.parse(content), cost };
  } catch (error) {
    console.error('Metadata extraction failed:', error);
    return { cost: 0 };
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

// Batch process multiple documents (with rate limiting) - uses minimal cost model by default
export async function batchProcessDocuments(
  documents: Array<{ id: string; ocrText: string }>,
  options: ProcessingOptions = {},
  onProgress?: (processed: number, total: number, totalCost: number) => void
): Promise<{ results: Map<string, AIProcessingResult>; totalCost: number }> {
  const results = new Map<string, AIProcessingResult>();
  const total = documents.length;
  let totalCost = 0;
  
  // Process in batches of 5 for gpt-4o-mini (higher rate limits)
  const model = options.model || 'gpt-4o-mini';
  const batchSize = model === 'gpt-4o-mini' ? 5 : 3;
  
  console.log(`[Batch Processing] Starting ${total} documents with ${model}`);
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          const result = await processDocumentWithAI(doc.ocrText, doc.id, options);
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
        totalCost += result.estimatedCost;
      }
    }
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total, totalCost);
    }
    
    // Rate limiting delay between batches (shorter for gpt-4o-mini)
    if (i + batchSize < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, model === 'gpt-4o-mini' ? 500 : 1000));
    }
  }
  
  console.log(`[Batch Processing] Completed ${results.size}/${total} documents. Total cost: $${totalCost.toFixed(4)}`);
  
  return { results, totalCost };
}

// Estimate cost for processing documents with different models
export function estimateProcessingCost(
  documentCount: number, 
  avgTextLength: number = 2000,
  model: AIModel = 'gpt-4o-mini'
): {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: AIModel;
  costComparison: Record<AIModel, number>;
} {
  // Rough token estimation: ~4 chars per token for Arabic
  const avgInputTokens = Math.ceil(avgTextLength / 4) + 500; // +500 for system prompt
  const avgOutputTokens = Math.ceil(avgTextLength / 4) + 200; // +200 for JSON structure
  
  const totalInputTokens = avgInputTokens * documentCount;
  const totalOutputTokens = avgOutputTokens * documentCount;
  
  const modelConfig = AI_MODELS[model];
  const inputCost = (totalInputTokens / 1000000) * modelConfig.inputCostPer1M;
  const outputCost = (totalOutputTokens / 1000000) * modelConfig.outputCostPer1M;
  
  // Calculate comparison for all models
  const costComparison: Record<AIModel, number> = {} as Record<AIModel, number>;
  for (const [modelName, config] of Object.entries(AI_MODELS)) {
    const cost = 
      (totalInputTokens / 1000000) * config.inputCostPer1M +
      (totalOutputTokens / 1000000) * config.outputCostPer1M;
    costComparison[modelName as AIModel] = Math.round(cost * 100) / 100;
  }
  
  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    estimatedCost: Math.round((inputCost + outputCost) * 100) / 100,
    model,
    costComparison,
  };
}

// Quick function to verify historical text accuracy with minimal cost
export async function verifyHistoricalAccuracy(
  ocrText: string,
  options: { model?: AIModel } = {}
): Promise<{
  isAccurate: boolean;
  correctedText: string;
  corrections: Array<{ original: string; corrected: string; reason: string }>;
  confidence: number;
  cost: number;
}> {
  const client = getOpenAIClient();
  const model = options.model || 'gpt-4o-mini';
  const modelConfig = AI_MODELS[model];
  
  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are an expert in Arabic historical texts and cinema archives. Analyze the OCR text for accuracy and identify any errors.

Focus on:
1. Historical accuracy of names, dates, and events mentioned
2. OCR errors in Arabic text (common character confusions)
3. Grammatical corrections while preserving historical language style
4. Movie titles and actor names verification

Return JSON:
{
  "isAccurate": true/false (true if text is mostly accurate with minor issues),
  "correctedText": "the full corrected text",
  "corrections": [
    {"original": "wrong text", "corrected": "right text", "reason": "why it was corrected"}
  ],
  "confidence": 0.0 to 1.0
}`,
        },
        {
          role: 'user',
          content: ocrText,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4000,
    });

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;

    console.log(`[Historical Verification] Model: ${model}, Cost: $${cost.toFixed(6)}`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        isAccurate: false,
        correctedText: ocrText,
        corrections: [],
        confidence: 0,
        cost,
      };
    }

    const result = JSON.parse(content);
    return {
      isAccurate: result.isAccurate ?? false,
      correctedText: result.correctedText || ocrText,
      corrections: result.corrections || [],
      confidence: result.confidence ?? 0.5,
      cost,
    };
  } catch (error) {
    console.error('Historical verification failed:', error);
    throw new Error(`Historical verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
