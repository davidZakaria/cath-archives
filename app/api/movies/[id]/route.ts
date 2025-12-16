// API routes for individual movie operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Movie from '@/models/Movie';
import mongoose from 'mongoose';

// GET - Get a single movie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const movie = await Movie.findById(id)
      .populate('actors', 'arabicName englishName type photoImage')
      .populate('relatedDocuments', 'filename imagePath formattedContent');

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      movie,
    });
  } catch (error) {
    console.error('Failed to fetch movie:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie' },
      { status: 500 }
    );
  }
}

// PATCH - Update a movie
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Remove fields that shouldn't be directly updated
    const { _id, createdAt, updatedAt, ...updateData } = body;

    const movie = await Movie.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      movie,
    });
  } catch (error) {
    console.error('Failed to update movie:', error);
    return NextResponse.json(
      { error: 'Failed to update movie' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a movie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid movie ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const movie = await Movie.findByIdAndDelete(id);

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Movie deleted',
    });
  } catch (error) {
    console.error('Failed to delete movie:', error);
    return NextResponse.json(
      { error: 'Failed to delete movie' },
      { status: 500 }
    );
  }
}
