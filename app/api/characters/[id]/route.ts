// API routes for individual character operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Character from '@/models/Character';
import mongoose from 'mongoose';

// GET - Get a single character
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid character ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const character = await Character.findById(id)
      .populate('movies', 'arabicName englishName year posterImage')
      .populate('relatedDocuments', 'filename imagePath formattedContent');

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error('Failed to fetch character:', error);
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500 }
    );
  }
}

// PATCH - Update a character
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid character ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Remove fields that shouldn't be directly updated
    const { _id, createdAt, updatedAt, ...updateData } = body;

    const character = await Character.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Valid character ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const character = await Character.findByIdAndDelete(id);

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Character deleted',
    });
  } catch (error) {
    console.error('Failed to delete character:', error);
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    );
  }
}
