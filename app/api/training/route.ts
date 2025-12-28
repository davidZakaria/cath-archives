// API route for AI training data - stores correction decisions for improvement
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CorrectionTraining from '@/models/CorrectionTraining';

// POST - Store a correction decision for training
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      documentId,
      collectionId,
      originalContext,
      originalText,
      suggestedCorrection,
      finalText,
      decision,
      correctionType,
      aiReason,
      userReason,
      aiModel,
      aiConfidence,
      position,
    } = body;

    // Validate required fields
    if (!documentId || !originalText || !suggestedCorrection || !decision || !correctionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create training record
    const trainingRecord = await CorrectionTraining.create({
      documentId,
      collectionId,
      originalContext: originalContext || '',
      originalText,
      suggestedCorrection,
      finalText: finalText || (decision === 'approved' ? suggestedCorrection : originalText),
      decision,
      correctionType,
      aiReason: aiReason || 'AI suggested correction',
      userReason,
      aiModel: aiModel || 'gpt-4o-mini',
      aiConfidence: aiConfidence || 0.8,
      position: position || { start: 0, end: 0 },
      reviewedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: trainingRecord._id,
      message: 'Training data stored successfully',
    });
  } catch (error) {
    console.error('Failed to store training data:', error);
    return NextResponse.json(
      { error: 'Failed to store training data' },
      { status: 500 }
    );
  }
}

// GET - Get accuracy metrics and training stats
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics';
    
    if (type === 'metrics') {
      // Get overall accuracy metrics
      const totalRecords = await CorrectionTraining.countDocuments();
      const approved = await CorrectionTraining.countDocuments({ decision: 'approved' });
      const rejected = await CorrectionTraining.countDocuments({ decision: 'rejected' });
      const modified = await CorrectionTraining.countDocuments({ decision: 'modified' });
      
      // Get metrics by correction type
      const byType = await CorrectionTraining.aggregate([
        {
          $group: {
            _id: '$correctionType',
            total: { $sum: 1 },
            approved: { 
              $sum: { $cond: [{ $eq: ['$decision', 'approved'] }, 1, 0] }
            },
            rejected: { 
              $sum: { $cond: [{ $eq: ['$decision', 'rejected'] }, 1, 0] }
            },
            avgConfidence: { $avg: '$aiConfidence' },
          },
        },
      ]);
      
      // Calculate accuracy rate
      const accuracyRate = totalRecords > 0 
        ? ((approved + modified) / totalRecords * 100).toFixed(1)
        : '0';
      
      // Get recent trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentTrend = await CorrectionTraining.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            approved: { 
              $sum: { $cond: [{ $eq: ['$decision', 'approved'] }, 1, 0] }
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      return NextResponse.json({
        success: true,
        metrics: {
          total: totalRecords,
          approved,
          rejected,
          modified,
          accuracyRate: parseFloat(accuracyRate),
          byType: byType.map(t => ({
            type: t._id,
            total: t.total,
            approved: t.approved,
            rejected: t.rejected,
            accuracyRate: t.total > 0 ? ((t.approved / t.total) * 100).toFixed(1) : '0',
            avgConfidence: (t.avgConfidence * 100).toFixed(1),
          })),
          recentTrend,
        },
      });
    }
    
    if (type === 'rejections') {
      // Get common rejection patterns to learn from
      const limit = parseInt(searchParams.get('limit') || '20');
      
      const rejections = await CorrectionTraining.aggregate([
        { $match: { decision: 'rejected' } },
        {
          $group: {
            _id: {
              original: '$originalText',
              suggested: '$suggestedCorrection',
              type: '$correctionType',
            },
            count: { $sum: 1 },
            reasons: { $addToSet: '$aiReason' },
            userReasons: { $addToSet: '$userReason' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);
      
      return NextResponse.json({
        success: true,
        rejections: rejections.map(r => ({
          original: r._id.original,
          suggested: r._id.suggested,
          type: r._id.type,
          count: r.count,
          aiReasons: r.reasons.filter(Boolean),
          userReasons: r.userReasons.filter(Boolean),
        })),
      });
    }
    
    if (type === 'patterns') {
      // Get successful correction patterns
      const limit = parseInt(searchParams.get('limit') || '50');
      
      const patterns = await CorrectionTraining.aggregate([
        { $match: { decision: 'approved' } },
        {
          $group: {
            _id: {
              original: '$originalText',
              corrected: '$finalText',
              type: '$correctionType',
            },
            count: { $sum: 1 },
            avgConfidence: { $avg: '$aiConfidence' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);
      
      return NextResponse.json({
        success: true,
        patterns: patterns.map(p => ({
          original: p._id.original,
          corrected: p._id.corrected,
          type: p._id.type,
          count: p.count,
          avgConfidence: (p.avgConfidence * 100).toFixed(1),
        })),
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid type parameter. Use: metrics, rejections, or patterns' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to get training metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get training metrics' },
      { status: 500 }
    );
  }
}

