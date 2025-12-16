// API route for getting batch status
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Batch from '@/models/Batch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const batch = await Batch.findOne({ batchId });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Calculate progress percentage
    const progress = batch.totalFiles > 0
      ? Math.round(((batch.completedFiles + batch.failedFiles) / batch.totalFiles) * 100)
      : 0;

    // Get status counts
    const statusCounts = batch.documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      batch: {
        batchId: batch.batchId,
        status: batch.status,
        totalFiles: batch.totalFiles,
        completedFiles: batch.completedFiles,
        failedFiles: batch.failedFiles,
        progress,
        statusCounts,
        documents: batch.documents,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        completedAt: batch.completedAt,
      },
    });
  } catch (error) {
    console.error('Failed to fetch batch status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch status' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to pause/resume/cancel batch
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use: pause, resume, or cancel' },
        { status: 400 }
      );
    }

    await connectDB();

    const batch = await Batch.findOne({ batchId });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    let newStatus: string;
    switch (action) {
      case 'pause':
        newStatus = 'paused';
        break;
      case 'resume':
        newStatus = 'processing';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
      default:
        newStatus = batch.status;
    }

    const updatedBatch = await Batch.findOneAndUpdate(
      { batchId },
      { status: newStatus },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      batch: {
        batchId: updatedBatch!.batchId,
        status: updatedBatch!.status,
      },
    });
  } catch (error) {
    console.error('Failed to update batch:', error);
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 }
    );
  }
}
