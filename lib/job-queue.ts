// Job Queue setup with BullMQ for background processing
import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

// Redis connection configuration
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Parse Redis URL
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

// Queue names
export const QUEUE_NAMES = {
  OCR_PROCESSING: 'ocr-processing',
  AI_PROCESSING: 'ai-processing',
  IMAGE_DETECTION: 'image-detection',
};

// Job types
export interface OCRJobData {
  documentId: string;
  imagePath: string;
  batchId?: string;
}

export interface AIJobData {
  documentId: string;
  ocrText: string;
  batchId?: string;
}

export interface ImageDetectionJobData {
  documentId: string;
  imagePath: string;
  batchId?: string;
}

export interface BatchJobData {
  batchId: string;
  files: Array<{
    filename: string;
    imagePath: string;
    documentId: string;
  }>;
}

// In-memory fallback queue for development without Redis
class InMemoryQueue {
  private jobs: Map<string, { data: unknown; status: string; result?: unknown; error?: string }> = new Map();
  private processor?: (job: { id: string; data: unknown }) => Promise<unknown>;

  async add(name: string, data: unknown): Promise<{ id: string }> {
    const id = uuidv4();
    this.jobs.set(id, { data, status: 'waiting' });
    
    // Process immediately in background
    if (this.processor) {
      this.processJob(id, data);
    }
    
    return { id };
  }

  private async processJob(id: string, data: unknown) {
    try {
      this.jobs.set(id, { data, status: 'active' });
      const result = await this.processor!({ id, data });
      this.jobs.set(id, { data, status: 'completed', result });
    } catch (error) {
      this.jobs.set(id, { 
        data, 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  setProcessor(processor: (job: { id: string; data: unknown }) => Promise<unknown>) {
    this.processor = processor;
  }

  getJob(id: string) {
    return this.jobs.get(id);
  }
}

// Queue instances (lazy initialization)
let ocrQueue: Queue | InMemoryQueue | null = null;
let aiQueue: Queue | InMemoryQueue | null = null;
let imageDetectionQueue: Queue | InMemoryQueue | null = null;

// Flag to track if Redis is available
let redisAvailable: boolean | null = null;

async function checkRedisAvailability(): Promise<boolean> {
  if (redisAvailable !== null) return redisAvailable;
  
  try {
    const IORedis = (await import('ioredis')).default;
    const connection = getRedisConnection();
    const redis = new IORedis(connection);
    
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    
    await redis.quit();
    redisAvailable = true;
    console.log('✅ Redis connected successfully');
    return true;
  } catch {
    redisAvailable = false;
    console.log('⚠️ Redis not available, using in-memory queue (development mode)');
    return false;
  }
}

export async function getOCRQueue(): Promise<Queue | InMemoryQueue> {
  if (ocrQueue) return ocrQueue;
  
  const useRedis = await checkRedisAvailability();
  
  if (useRedis) {
    ocrQueue = new Queue(QUEUE_NAMES.OCR_PROCESSING, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  } else {
    ocrQueue = new InMemoryQueue();
  }
  
  return ocrQueue;
}

export async function getAIQueue(): Promise<Queue | InMemoryQueue> {
  if (aiQueue) return aiQueue;
  
  const useRedis = await checkRedisAvailability();
  
  if (useRedis) {
    aiQueue = new Queue(QUEUE_NAMES.AI_PROCESSING, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  } else {
    aiQueue = new InMemoryQueue();
  }
  
  return aiQueue;
}

export async function getImageDetectionQueue(): Promise<Queue | InMemoryQueue> {
  if (imageDetectionQueue) return imageDetectionQueue;
  
  const useRedis = await checkRedisAvailability();
  
  if (useRedis) {
    imageDetectionQueue = new Queue(QUEUE_NAMES.IMAGE_DETECTION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  } else {
    imageDetectionQueue = new InMemoryQueue();
  }
  
  return imageDetectionQueue;
}

// Worker creation for Redis-based queues
export function createOCRWorker(
  processor: (job: Job<OCRJobData>) => Promise<void>
): Worker | null {
  if (!redisAvailable) {
    console.log('⚠️ Workers not available in development mode');
    return null;
  }
  
  return new Worker(QUEUE_NAMES.OCR_PROCESSING, processor, {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 images at a time
  });
}

export function createAIWorker(
  processor: (job: Job<AIJobData>) => Promise<void>
): Worker | null {
  if (!redisAvailable) {
    console.log('⚠️ Workers not available in development mode');
    return null;
  }
  
  return new Worker(QUEUE_NAMES.AI_PROCESSING, processor, {
    connection: getRedisConnection(),
    concurrency: 3, // Process 3 documents at a time (API rate limits)
  });
}

// Add job to OCR queue
export async function addOCRJob(data: OCRJobData): Promise<string> {
  const queue = await getOCRQueue();
  const job = await queue.add('process-ocr', data);
  return job.id || 'unknown';
}

// Add job to AI queue
export async function addAIJob(data: AIJobData): Promise<string> {
  const queue = await getAIQueue();
  const job = await queue.add('process-ai', data);
  return job.id || 'unknown';
}

// Add job to Image Detection queue
export async function addImageDetectionJob(data: ImageDetectionJobData): Promise<string> {
  const queue = await getImageDetectionQueue();
  const job = await queue.add('detect-images', data);
  return job.id || 'unknown';
}
