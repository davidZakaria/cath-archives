import ReviewInterface from '@/components/ReviewInterface';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

async function getDocument(id: string) {
  try {
    await connectDB();
    const doc = await Document.findById(id).lean();
    
    if (!doc) return null;
    
    // Convert MongoDB document to plain JSON-serializable object
    return JSON.parse(JSON.stringify({
      _id: doc._id.toString(),
      filename: doc.filename || '',
      imagePath: doc.imagePath || '',
      imageMetadata: doc.imageMetadata || { width: 0, height: 0, size: 0, format: '' },
      ocrText: doc.ocrText || '',
      ocrConfidence: doc.ocrConfidence || 0,
      ocrBlocks: doc.ocrBlocks || [],
      ocrProcessedAt: doc.ocrProcessedAt,
      verifiedText: doc.verifiedText || '',
      reviewStatus: doc.reviewStatus || 'pending',
      reviewStartedAt: doc.reviewStartedAt,
      reviewCompletedAt: doc.reviewCompletedAt,
      reviewTimeSeconds: doc.reviewTimeSeconds || 0,
      correctionsCount: doc.correctionsCount || 0,
      reviewNotes: doc.reviewNotes || '',
      uploadedAt: doc.uploadedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return <ReviewInterface document={document} />;
}

