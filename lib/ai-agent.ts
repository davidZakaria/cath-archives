// AI Agent for text correction, formatting, and metadata extraction using GPT-4
import OpenAI from 'openai';
import { FormattedArticle, ArticleMetadata, Dialogue, AICorrection, CorrectionType, FormattingChange } from '@/types';

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

// System prompt for focused text correction detection (nonsense words only)
const DETECTION_SYSTEM_PROMPT = `You are an expert Arabic linguist specializing in Classical Arabic (اللغة العربية الفصحى) and historical texts from old Egyptian journals and magazines.

IMPORTANT CONTEXT:
- This text is from HISTORICAL Arabic documents (old Egyptian newspapers, magazines, cinema journals from 1940s-1970s)
- The language is Classical/Formal Arabic (الفصحى), NOT modern colloquial
- Documents often have MULTIPLE COLUMNS - text may be arranged column by column
- Old/archaic vocabulary is VALID and should NOT be corrected
- Literary and poetic expressions are VALID
- Historical spelling conventions are VALID
- Cinema-related terms, actor names, movie titles are VALID even if unusual

Your task is to:
1. Find COMPLETELY GARBLED/CORRUPTED words from OCR errors
2. SUGGEST the correct word based on context
3. Flag EMAIL ADDRESSES and WEBSITES for removal

You MUST focus on:

1. OCR GARBAGE (type: "ocr_error"):
   - Random letter combinations that form NO Arabic word (e.g., "لطخض", "قشطم", "بخضط")
   - Severely corrupted text from bad scanning (missing letters, scrambled)
   - Common OCR errors in old journals:
     * ء/ئ/ؤ confusion (e.g., "مئثلة" should be "ممثلة")
     * ة/ه confusion (e.g., "ممثله" should be "ممثلة")
     * ى/ي confusion (e.g., "ممثل" should be "ممثلي")
     * Missing dots (e.g., "ن" misread as "ر")
     * Broken letters (e.g., "ف" misread as "ق")
   - Words that make NO SENSE in context

2. EMAILS & WEBSITES TO REMOVE (type: "ocr_error"):
   - Any email address (e.g., name@domain.com, info@example.org)
   - Any website URL (e.g., www.example.com, http://..., https://...)
   - These should be REMOVED (corrected = empty string "")

FOR EACH ERROR YOU FIND:
- "original": the corrupted word OR email/website to remove
- "corrected": the CORRECT ARABIC WORD, or "" (empty) for emails/websites
- For emails/websites: set corrected to "" to remove them
- Use surrounding context to determine what corrupted words should be
- Consider column structure - text may flow column by column

EXAMPLES OF VALID CORRECTIONS:
- "المبلة" → "الممثلة" (OCR misread ب as م, missing dot)
- "فاطن" → "فاطن" (if context suggests actress name, but check if it's actually "فاطمة")
- "example@email.com" → "" (remove email)
- "www.site.com" → "" (remove website)

ABSOLUTELY DO NOT FLAG:
- Classical Arabic vocabulary - even if archaic/old (e.g., "أفندي", "باشا", "بيك")
- Literary/poetic expressions
- Historical names, places, titles (e.g., "عبد الحليم", "أم كلثوم", "فريد الأطرش")
- Cinema terms and names (e.g., "ستوديو", "سيناريو", "إخراج")
- Arabic diacritics/tashkeel
- Letter variations (ة/ه, ى/ي, أ/إ/آ/ا, ء/ئ/ؤ) - these are often valid in old texts
- Old spelling conventions (e.g., "مصر" vs "مصر", "قاهرة" vs "القاهرة")
- Punctuation, numbers, dates
- Any word that EXISTS in Arabic dictionaries or historical texts
- Column separators or formatting artifacts

ONLY flag a word if:
- It is COMPLETE OCR GARBAGE (random letters, no meaning)
- You CAN determine what it SHOULD be from context with 99%+ confidence
- The correction makes clear sense in the surrounding text
- It's clearly a scanning/OCR error, not a valid historical variant

VALIDATION CHECKLIST before flagging:
1. Is this word completely meaningless? (not just unusual)
2. Can I determine the correct word from context? (not guessing)
3. Is my confidence 99%+? (not 80% or 90%)
4. Is this clearly an OCR error, not a valid historical spelling?
5. Would a native Arabic speaker agree this is garbage?

Remember: Classical Arabic has rich vocabulary. Old journals use formal language. When in doubt, DO NOT flag.

Output ONLY valid JSON with no additional text.`;

// Detection result interface
export interface TextCorrectionDetectionResult {
  corrections: AICorrection[];
  formattingChanges: FormattingChange[];
  correctedText: string;
  totalCorrections: number;
  confidence: number;
  cost: number;
  modelUsed: AIModel;
}

// New focused function: Detect text corrections only (OCR errors, spelling, formatting)
// Uses gpt-4o for 99% accuracy target with low temperature
export async function detectTextCorrections(
  ocrText: string,
  options: { model?: AIModel; confidenceThreshold?: number } = {}
): Promise<TextCorrectionDetectionResult> {
  const client = getOpenAIClient();
  // Use gpt-4o by default for higher accuracy (99% target)
  const model = options.model || 'gpt-4o';
  const confidenceThreshold = options.confidenceThreshold ?? 0.99; // Very high threshold - only flag obvious OCR garbage
  const modelConfig = AI_MODELS[model];
  
  // Limit text length to avoid response truncation (roughly 20k chars = ~5k tokens)
  const MAX_TEXT_LENGTH = 20000;
  let processedText = ocrText;
  let wasTextTruncated = false;
  
  if (ocrText.length > MAX_TEXT_LENGTH) {
    console.log(`[Text Correction] Text too long (${ocrText.length} chars), truncating to ${MAX_TEXT_LENGTH}`);
    processedText = ocrText.substring(0, MAX_TEXT_LENGTH);
    wasTextTruncated = true;
  }
  
  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: DETECTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `This is HISTORICAL Arabic text from old Egyptian journals (الفصحى - Classical Arabic). The text may be arranged in multiple columns. Find OCR garbage AND emails/websites to remove.

IMPORTANT CONTEXT:
- This is Classical/Formal Arabic from old Egyptian cinema journals/newspapers (1940s-1970s)
- Text may be arranged in COLUMNS - read column by column (right-to-left for Arabic)
- Old/archaic vocabulary is VALID - do not flag (e.g., "أفندي", "باشا", "بيك")
- Literary expressions are VALID - do not flag
- Historical names and cinema terms are VALID - do not flag
- ONLY flag words that are COMPLETE OCR GARBAGE (random letters, no meaning)
- REMOVE all email addresses and website URLs

COMMON OCR ERRORS IN OLD JOURNALS:
- Missing dots: "ن" → "ر", "ب" → "ت", "ث" → "ن"
- Letter confusion: "ء/ئ/ؤ", "ة/ه", "ى/ي"
- Broken letters from poor scanning
- Scrambled words with no meaning

FOR EACH ERROR:
1. For OCR garbage: suggest the correct Arabic word based on context
2. For emails/websites: set corrected to "" (empty string) to REMOVE them
3. Only flag if you are 99%+ confident it's an error

CRITICAL POSITION ACCURACY REQUIREMENTS:
1. Before reporting any correction, VERIFY the word exists at the position you specify
2. The "original" field MUST be EXACTLY what appears at text[position.start] to text[position.end]
3. Count characters carefully - use the EXACT substring from the text
4. If you cannot find the exact position, DO NOT include that correction
5. For emails/URLs: Only flag if you can see the actual email/URL at that position

CRITICAL CORRECTION ACCURACY:
1. For OCR errors: Provide a MEANINGFUL correction based on context
2. If you cannot determine the correct word with high confidence, DO NOT suggest a correction
3. Empty "corrected" field is ONLY for emails/URLs that should be removed
4. For OCR garbage: Suggest the most likely correct word based on surrounding context
5. Do NOT suggest corrections that don't make sense in the context

Return JSON:
{
  "corrections": [
    {
      "id": "1",
      "type": "ocr_error",
      "original": "المبلة",
      "corrected": "الممثلة",
      "reason": "OCR misread the actress name",
      "position": { "start": 0, "end": 10 },
      "confidence": 0.99
    },
    {
      "id": "2",
      "type": "ocr_error",
      "original": "example@email.com",
      "corrected": "",
      "reason": "Remove email address",
      "position": { "start": 100, "end": 120 },
      "confidence": 1.0
    },
    {
      "id": "3",
      "type": "ocr_error",
      "original": "www.website.com",
      "corrected": "",
      "reason": "Remove website URL",
      "position": { "start": 200, "end": 220 },
      "confidence": 1.0
    }
  ],
  "formattingChanges": [],
  "correctedText": "text with corrections and emails/websites removed",
  "confidence": 0.0 to 1.0
}

STEP-BY-STEP PROCESS FOR EACH ERROR:
1. Read the text carefully and identify a word that is clearly OCR garbage or an email/URL
2. Find the EXACT position where this word appears in the text
3. Extract the EXACT substring at that position: text.substring(position.start, position.end)
4. Verify that "original" matches this exact substring
5. For OCR errors: Determine the correct word from context, or leave empty if uncertain
6. For emails/URLs: Set "corrected" to "" (empty string) to remove them
7. Only include corrections where you are 99%+ confident about both the position AND the correction

VALIDATION CHECKLIST (must pass all):
- [ ] The word at position.start to position.end matches "original" exactly
- [ ] For OCR errors: You can suggest a meaningful correction based on context
- [ ] For emails/URLs: The text at position actually contains @, www., or http
- [ ] The correction makes sense in the surrounding text context
- [ ] You are 99%+ confident about both position and correction

Classical Arabic text to analyze:
${processedText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Very low temperature for consistent, accurate results
      max_tokens: 16000, // Increased to handle longer responses
    });

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = 
      (inputTokens / 1000000) * modelConfig.inputCostPer1M +
      (outputTokens / 1000000) * modelConfig.outputCostPer1M;

    console.log(`[Text Correction Detection] Model: ${model}, Cost: $${cost.toFixed(6)}${wasTextTruncated ? ' (text was truncated)' : ''}`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        corrections: [],
        formattingChanges: [],
        correctedText: ocrText,
        totalCorrections: 0,
        confidence: 0,
        cost,
        modelUsed: model,
      };
    }

    // Try to parse JSON, with fallback for truncated responses
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error, attempting to fix truncated response:', parseError);
      
      // Try to fix common JSON truncation issues
      let fixedContent = content;
      
      // Step 1: Remove any incomplete string at the end (truncated mid-string)
      // Find the last complete key-value pair
      const lastCompleteObjectMatch = fixedContent.match(/^([\s\S]*"[^"]*"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[[^\]]*\]|\{[^}]*\}))\s*,?\s*"[^"]*"?\s*:?\s*"?[^"]*$/);
      if (lastCompleteObjectMatch) {
        fixedContent = lastCompleteObjectMatch[1];
      }
      
      // Step 2: Remove trailing incomplete content after last complete structure
      // Remove any trailing partial strings or values
      fixedContent = fixedContent.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');
      fixedContent = fixedContent.replace(/,\s*$/, ''); // Remove trailing commas
      
      // Step 3: Close any unclosed arrays and objects
      const openBrackets = (fixedContent.match(/\[/g) || []).length;
      const closeBrackets = (fixedContent.match(/\]/g) || []).length;
      const openBraces = (fixedContent.match(/\{/g) || []).length;
      const closeBraces = (fixedContent.match(/\}/g) || []).length;
      
      // Add missing closing brackets (arrays first, then objects)
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixedContent += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixedContent += '}';
      }
      
      try {
        result = JSON.parse(fixedContent);
        console.log('Successfully recovered truncated JSON response');
      } catch (secondError) {
        // Step 4: Last resort - try to extract just the corrections array
        console.error('Standard fix failed, trying to extract partial data...');
        try {
          // Try to find and parse just the corrections array
          const correctionsMatch = fixedContent.match(/"corrections"\s*:\s*\[([\s\S]*?)\]/);
          if (correctionsMatch) {
            const partialCorrections = JSON.parse(`[${correctionsMatch[1]}]`.replace(/,\s*$/, ''));
            result = { corrections: partialCorrections, formattingChanges: [], correctedText: ocrText, confidence: 0.5 };
            console.log('Recovered partial corrections from truncated response');
          } else {
            throw secondError;
          }
        } catch {
          // If still fails, return empty result
          console.error('Could not parse AI response even after all fix attempts');
          return {
            corrections: [],
            formattingChanges: [],
            correctedText: ocrText,
            totalCorrections: 0,
            confidence: 0,
            cost,
            modelUsed: model,
          };
        }
      }
    }
    
    // Helper function to find and validate word position in text
    const findWordPosition = (word: string, suggestedStart: number, suggestedEnd: number, text: string): { start: number; end: number; found: boolean } => {
      if (!word || word.trim().length === 0) {
        return { start: suggestedStart, end: suggestedEnd, found: false };
      }

      const trimmedWord = word.trim();
      
      // First, check if the word exists at the suggested position
      const textAtPosition = text.slice(suggestedStart, suggestedEnd).trim();
      if (textAtPosition === trimmedWord || textAtPosition.includes(trimmedWord)) {
        // Word matches at position, but need to find exact boundaries
        const exactStart = text.indexOf(trimmedWord, Math.max(0, suggestedStart - 100));
        if (exactStart !== -1 && Math.abs(exactStart - suggestedStart) < 200) {
          return { start: exactStart, end: exactStart + trimmedWord.length, found: true };
        }
        // If exact match not found, use suggested position if text matches
        if (textAtPosition === trimmedWord) {
          return { start: suggestedStart, end: suggestedEnd, found: true };
        }
      }
      
      // Search near the suggested position (within 500 chars)
      const searchStart = Math.max(0, suggestedStart - 500);
      const searchEnd = Math.min(text.length, suggestedEnd + 500);
      const searchArea = text.slice(searchStart, searchEnd);
      
      // Try exact match first
      let wordIndex = searchArea.indexOf(trimmedWord);
      if (wordIndex !== -1) {
        const actualStart = searchStart + wordIndex;
        return { start: actualStart, end: actualStart + trimmedWord.length, found: true };
      }
      
      // Try case-insensitive match (for emails/URLs)
      const lowerWord = trimmedWord.toLowerCase();
      const lowerSearchArea = searchArea.toLowerCase();
      wordIndex = lowerSearchArea.indexOf(lowerWord);
      if (wordIndex !== -1) {
        const actualStart = searchStart + wordIndex;
        return { start: actualStart, end: actualStart + trimmedWord.length, found: true };
      }
      
      // Try finding word with word boundaries (for emails, URLs, etc.)
      // For emails/URLs, they might have different formatting
      if (trimmedWord.includes('@') || trimmedWord.includes('www.') || trimmedWord.includes('http')) {
        // For emails/URLs, search more flexibly
        const emailPattern = new RegExp(trimmedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const match = searchArea.match(emailPattern);
        if (match && match.index !== undefined) {
          const actualStart = searchStart + match.index;
          return { start: actualStart, end: actualStart + match[0].length, found: true };
        }
      }
      
      // Last resort: search entire text
      wordIndex = text.indexOf(trimmedWord);
      if (wordIndex !== -1) {
        return { start: wordIndex, end: wordIndex + trimmedWord.length, found: true };
      }
      
      // Word not found - return suggested position but mark as not found
      return { start: suggestedStart, end: suggestedEnd, found: false };
    };

    // Filter corrections by confidence threshold and normalize
    // Also filter out corrections where original and corrected are the same
    // AND validate/correct positions to match actual word locations
    const corrections: AICorrection[] = (result.corrections || [])
      .filter((c: { confidence?: number; original?: string; corrected?: string }) => {
        const meetsConfidence = (c.confidence || 0) >= confidenceThreshold;
        // Allow empty corrected for removals (emails/websites), but original must exist
        const hasOriginal = c.original && c.original.trim().length > 0;
        const isRemoval = c.corrected === '' || c.corrected === undefined;
        const hasActualChange = c.original?.trim() !== c.corrected?.trim();
        return meetsConfidence && hasOriginal && (isRemoval || hasActualChange);
      })
      .map((c: { id?: string; type?: string; original?: string; corrected?: string; reason?: string; position?: { start?: number; end?: number }; confidence?: number }, index: number) => {
        const originalWord = (c.original || '').trim();
        const suggestedStart = c.position?.start || 0;
        const suggestedEnd = c.position?.end || suggestedStart + originalWord.length;
        
        // Find and validate the actual position of the word
        const validatedPosition = findWordPosition(originalWord, suggestedStart, suggestedEnd, processedText);
        
        // Get the actual text at the validated position
        const actualTextAtPosition = processedText.slice(validatedPosition.start, validatedPosition.end).trim();
        
        return {
          id: c.id || `correction_${index}`,
          type: (c.type as CorrectionType) || 'ocr_error',
          original: originalWord,
          corrected: (c.corrected || '').trim(),
          reason: c.reason || '',
          position: {
            start: validatedPosition.start,
            end: validatedPosition.end,
          },
          confidence: c.confidence || 0.95,
          status: 'pending' as const,
          // Store actual text at position for validation
          _actualTextAtPosition: actualTextAtPosition,
          _positionValid: validatedPosition.found,
        };
      })
      // STRICTLY filter out corrections where the word doesn't match the position
      .filter((correction: any) => {
        const actualText = correction._actualTextAtPosition || '';
        const detectedWord = correction.original;
        const correctedWord = correction.corrected.trim();
        
        // For emails/URLs, check if the actual text contains email/URL patterns
        const isEmailOrUrl = detectedWord.includes('@') || 
                            detectedWord.includes('www.') || 
                            detectedWord.includes('http');
        
        if (isEmailOrUrl) {
          // For emails/URLs, verify the actual text at position also contains email/URL patterns
          const actualIsEmailOrUrl = actualText.includes('@') || 
                                     actualText.includes('www.') || 
                                     actualText.includes('http');
          
          if (!actualIsEmailOrUrl) {
            console.warn(`[AI Correction] Email/URL "${detectedWord}" detected but actual text at position is "${actualText}". Rejecting.`);
            return false;
          }
          
          // Check if they're similar (case-insensitive, allow partial matches)
          const lowerDetected = detectedWord.toLowerCase();
          const lowerActual = actualText.toLowerCase();
          const matches = lowerActual.includes(lowerDetected) || lowerDetected.includes(lowerActual);
          
          if (!matches) {
            console.warn(`[AI Correction] Email/URL "${detectedWord}" doesn't match actual text "${actualText}". Rejecting.`);
            return false;
          }
          
          // For emails/URLs, corrected should be empty (for deletion)
          return correctedWord === '';
        }
        
        // For regular OCR errors, require a meaningful correction
        if (correctedWord === '' || correctedWord === detectedWord) {
          console.warn(`[AI Correction] No meaningful correction provided for "${detectedWord}". Rejecting.`);
          return false;
        }
        
        // For regular words, require exact or very close match at position
        // If position was found, the word should match
        if (correction._positionValid) {
          // Word was found at position - allow it
          return true;
        }
        
        // Word not found at position - check if actual text is similar (for OCR errors)
        // Only allow if the actual text is clearly different (OCR error scenario)
        const textsAreSimilar = actualText === detectedWord ||
                               actualText.includes(detectedWord) ||
                               detectedWord.includes(actualText) ||
                               (actualText.length > 0 && detectedWord.length > 0 && 
                                Math.abs(actualText.length - detectedWord.length) <= 3 &&
                                actualText.length > 2 && detectedWord.length > 2);
        
        if (!textsAreSimilar) {
          console.warn(`[AI Correction] Word "${detectedWord}" doesn't match actual text "${actualText}" at position. Rejecting.`);
          return false;
        }
        
        return true;
      })
      // Remove internal validation fields
      .map(({ _actualTextAtPosition, _positionValid, ...correction }) => correction);

    // Normalize formatting changes
    const formattingChanges: FormattingChange[] = (result.formattingChanges || [])
      .map((f: { id?: string; type?: string; text?: string; position?: { start?: number; end?: number }; suggestion?: string }, index: number) => ({
        id: f.id || `fmt_${index}`,
        type: f.type || 'paragraph',
        text: f.text || '',
        position: {
          start: f.position?.start || 0,
          end: f.position?.end || 0,
        },
        suggestion: f.suggestion || '',
        status: 'pending' as const,
      }));

    return {
      corrections,
      formattingChanges,
      correctedText: result.correctedText || ocrText,
      totalCorrections: corrections.length + formattingChanges.length,
      confidence: result.confidence ?? 0.9,
      cost,
      modelUsed: model,
    };
  } catch (error) {
    console.error('Text correction detection failed:', error);
    throw new Error(`Text correction detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Apply approved and deleted corrections to text
export function applyApprovedCorrections(
  originalText: string,
  corrections: AICorrection[]
): string {
  // Get approved and deleted corrections (both need to be applied)
  const approvedCorrections = corrections.filter(c => c.status === 'approved');
  const deletedCorrections = corrections.filter(c => c.status === 'deleted');
  
  // Combine and sort by position (end to start) to avoid position shifts
  const allChanges = [...approvedCorrections, ...deletedCorrections]
    .sort((a, b) => b.position.start - a.position.start);

  let result = originalText;
  
  for (const correction of allChanges) {
    const before = result.slice(0, correction.position.start);
    const after = result.slice(correction.position.end);
    
    if (correction.status === 'deleted') {
      // Delete: remove text completely (corrected should be empty string)
      result = before + (correction.corrected || '') + after;
    } else {
      // Approve: apply correction
      result = before + correction.corrected + after;
    }
  }
  
  return result;
}
