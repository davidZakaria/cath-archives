// AI Embeddings service for semantic similarity search
import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Default for text-embedding-3-small

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  // Truncate text if too long (max ~8000 tokens for this model)
  const maxChars = 25000; // Approximate, leaves headroom
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  
  // Truncate texts
  const maxChars = 25000;
  const truncatedTexts = texts.map(t => t.length > maxChars ? t.substring(0, maxChars) : t);
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
    });
    
    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar embeddings from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; similarity: number }> {
  const similarities = embeddings.map(item => ({
    id: item.id,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));
  
  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, topK);
}

/**
 * Create text for embedding from collection data
 */
export function createEmbeddingText(collection: {
  title: string;
  subtitle?: string;
  description?: string;
  combinedOcrText?: string;
  combinedAiText?: string;
  metadata?: {
    movies?: string[];
    characters?: string[];
    source?: string;
  };
}): string {
  const parts: string[] = [];
  
  // Title is most important
  if (collection.title) {
    parts.push(collection.title);
    parts.push(collection.title); // Weight it by repeating
  }
  
  if (collection.subtitle) {
    parts.push(collection.subtitle);
  }
  
  if (collection.description) {
    parts.push(collection.description);
  }
  
  // Metadata entities
  if (collection.metadata?.movies?.length) {
    parts.push('أفلام: ' + collection.metadata.movies.join(', '));
  }
  
  if (collection.metadata?.characters?.length) {
    parts.push('شخصيات: ' + collection.metadata.characters.join(', '));
  }
  
  // Use AI-corrected text if available, otherwise OCR text
  const mainText = collection.combinedAiText || collection.combinedOcrText;
  if (mainText) {
    // Take first portion for embedding
    const textPortion = mainText.substring(0, 10000);
    parts.push(textPortion);
  }
  
  return parts.join('\n\n');
}

/**
 * Generate and store embedding for a collection
 */
export async function generateCollectionEmbedding(
  collectionId: string,
  collectionData: Parameters<typeof createEmbeddingText>[0]
): Promise<number[]> {
  const text = createEmbeddingText(collectionData);
  const embedding = await generateEmbedding(text);
  
  // Store embedding in database
  const { default: connectDB } = await import('./mongodb');
  const { default: Collection } = await import('@/models/Collection');
  
  await connectDB();
  await Collection.findByIdAndUpdate(collectionId, {
    embedding,
    embeddingGeneratedAt: new Date(),
  });
  
  return embedding;
}

/**
 * Find related collections using embedding similarity
 */
export async function findRelatedCollections(
  collectionId: string,
  topK: number = 5
): Promise<Array<{ _id: string; title: string; similarity: number }>> {
  const { default: connectDB } = await import('./mongodb');
  const { default: Collection } = await import('@/models/Collection');
  
  await connectDB();
  
  // Get the source collection's embedding
  const sourceCollection = await Collection.findById(collectionId).select('embedding title');
  
  if (!sourceCollection?.embedding?.length) {
    console.log('Source collection has no embedding');
    return [];
  }
  
  // Get all other collections with embeddings
  const otherCollections = await Collection.find({
    _id: { $ne: collectionId },
    status: 'published',
    embedding: { $exists: true, $ne: [] },
  }).select('_id title embedding');
  
  if (otherCollections.length === 0) {
    return [];
  }
  
  // Calculate similarities
  const similarities = otherCollections.map(c => ({
    _id: c._id.toString(),
    title: c.title,
    similarity: cosineSimilarity(sourceCollection.embedding, c.embedding),
  }));
  
  // Sort and return top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  return similarities.slice(0, topK);
}

