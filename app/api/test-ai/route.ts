// Test endpoint for AI agent - verifies historical accuracy without needing a document
import { NextRequest, NextResponse } from 'next/server';
import { verifyHistoricalAccuracy, processDocumentWithAI, estimateProcessingCost, AIModel, AI_MODELS } from '@/lib/ai-agent';

// Sample Arabic cinema text for testing
const SAMPLE_ARABIC_TEXT = `في عام ١٩٥٢ قدم المخرج صلاح ابو سيف فيلم "الاسطى حسن" بطولة فريد شوقي وهدى سلطان.
كان الفيلم من انتاج استوديو مصر وحقق نجاحا كبيرا في دور العرض.
قال فريد شوقي في حوار صحفي: "هذا الفيلم يمثل نقطة تحول في مسيرتي الفنيه"
المخرج صلاح ابو سيف اشتهر بتقديم افلام الواقعيه المصريه.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Get text from body or use sample
    const text = body.text || SAMPLE_ARABIC_TEXT;
    const model: AIModel = (body.model && AI_MODELS[body.model as AIModel]) 
      ? body.model as AIModel 
      : 'gpt-4o-mini';
    const mode = body.mode || 'verify'; // 'verify' or 'full'

    console.log(`[Test AI] Mode: ${mode}, Model: ${model}, Text length: ${text.length}`);

    let result;
    
    if (mode === 'full') {
      // Full document processing
      result = await processDocumentWithAI(text, 'test-document', { model });
      return NextResponse.json({
        success: true,
        mode: 'full',
        modelUsed: result.modelUsed,
        cost: `$${result.estimatedCost.toFixed(6)}`,
        confidence: result.confidence,
        correctedText: result.correctedText,
        formattedContent: result.formattedContent,
        metadata: result.metadata,
      });
    } else {
      // Historical accuracy verification (lighter)
      result = await verifyHistoricalAccuracy(text, { model });
      return NextResponse.json({
        success: true,
        mode: 'verify',
        modelUsed: model,
        cost: `$${result.cost.toFixed(6)}`,
        isAccurate: result.isAccurate,
        confidence: result.confidence,
        correctionsCount: result.corrections.length,
        corrections: result.corrections,
        correctedText: result.correctedText,
      });
    }
  } catch (error) {
    console.error('Test AI error:', error);
    return NextResponse.json(
      { 
        error: 'AI test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure OPENAI_API_KEY is set in .env.local'
      },
      { status: 500 }
    );
  }
}

// GET endpoint - shows available options and cost estimate
export async function GET() {
  const estimate = estimateProcessingCost(1, 500, 'gpt-4o-mini');
  
  return NextResponse.json({
    message: 'AI Agent Test Endpoint',
    usage: {
      method: 'POST',
      body: {
        text: '(optional) Arabic text to analyze - uses sample if not provided',
        model: '(optional) gpt-4o-mini | gpt-4o | gpt-4-turbo-preview',
        mode: '(optional) verify | full',
      },
    },
    availableModels: Object.entries(AI_MODELS).map(([name, config]) => ({
      name,
      description: config.description,
      inputCost: `$${config.inputCostPer1M}/1M tokens`,
      outputCost: `$${config.outputCostPer1M}/1M tokens`,
    })),
    sampleEstimate: {
      model: 'gpt-4o-mini',
      estimatedCost: `$${estimate.estimatedCost}`,
      note: 'For 1 document with ~500 chars',
    },
    costComparison: estimate.costComparison,
    sampleText: SAMPLE_ARABIC_TEXT,
  });
}
