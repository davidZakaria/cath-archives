// API route for getting metrics and statistics
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';
import { ReviewMetrics } from '@/types';

export async function GET() {
  try {
    await connectDB();

    const [
      totalDocuments,
      pendingReview,
      inProgress,
      completed,
      avgConfidenceResult,
      avgReviewTimeResult,
      avgCorrectionsResult,
    ] = await Promise.all([
      Document.countDocuments(),
      Document.countDocuments({ reviewStatus: 'pending' }),
      Document.countDocuments({ reviewStatus: 'in_progress' }),
      Document.countDocuments({ reviewStatus: 'completed' }),
      Document.aggregate([
        { $group: { _id: null, avgConfidence: { $avg: '$ocrConfidence' } } },
      ]),
      Document.aggregate([
        { $match: { reviewTimeSeconds: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgTime: { $avg: '$reviewTimeSeconds' } } },
      ]),
      Document.aggregate([
        { $match: { correctionsCount: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgCorrections: { $avg: '$correctionsCount' } } },
      ]),
    ]);

    const metrics: ReviewMetrics = {
      totalDocuments,
      pendingReview,
      inProgress,
      completed,
      avgOcrConfidence: avgConfidenceResult[0]?.avgConfidence || 0,
      avgReviewTime: avgReviewTimeResult[0]?.avgTime || 0,
      avgCorrections: avgCorrectionsResult[0]?.avgCorrections || 0,
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

