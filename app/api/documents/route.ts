// API route for listing documents
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.reviewStatus = status;
    }

    // Get documents sorted by upload date (newest first)
    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        ...doc,
        _id: doc._id.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

