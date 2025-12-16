// API route for getting and updating a single document
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const document = await Document.findById(id).lean();

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        _id: document._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const {
      verifiedText,
      reviewStatus,
      reviewNotes,
      reviewStartedAt,
      reviewCompletedAt,
      reviewTimeSeconds,
      correctionsCount,
    } = body;

    // Build update object
    const update: any = {};
    if (verifiedText !== undefined) update.verifiedText = verifiedText;
    if (reviewStatus !== undefined) update.reviewStatus = reviewStatus;
    if (reviewNotes !== undefined) update.reviewNotes = reviewNotes;
    if (reviewStartedAt !== undefined) update.reviewStartedAt = reviewStartedAt;
    if (reviewCompletedAt !== undefined) update.reviewCompletedAt = reviewCompletedAt;
    if (reviewTimeSeconds !== undefined) update.reviewTimeSeconds = reviewTimeSeconds;
    if (correctionsCount !== undefined) update.correctionsCount = correctionsCount;

    const document = await Document.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).lean();

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        _id: document._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

