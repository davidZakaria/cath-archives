// API route for managing collection version history
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';

// GET - Get version history for a collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const collection = await Collection.findById(id).select(
      'title versions currentVersion createdAt updatedAt'
    );

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      collectionId: id,
      title: collection.title,
      currentVersion: collection.currentVersion || 1,
      versions: collection.versions || [],
      totalVersions: collection.versions?.length || 0,
    });
  } catch (error) {
    console.error('Failed to get version history:', error);
    return NextResponse.json(
      { error: 'Failed to get version history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new version (save current state)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { changes, modifiedBy } = body;

    await connectDB();

    const collection = await Collection.findById(id);

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Calculate new version number
    const currentVersionNum = collection.currentVersion || 1;
    const newVersionNum = currentVersionNum + 1;

    // Create snapshot of current state
    const snapshot = {
      title: collection.title,
      combinedOcrText: collection.combinedOcrText,
      combinedAiText: collection.combinedAiText,
    };

    // Add new version to history
    const newVersion = {
      versionNumber: currentVersionNum, // Save the OLD version
      changes: changes || 'Manual save',
      modifiedBy: modifiedBy || 'system',
      modifiedAt: new Date(),
      snapshot,
    };

    // Update collection with new version
    await Collection.findByIdAndUpdate(id, {
      $push: { versions: newVersion },
      currentVersion: newVersionNum,
    });

    return NextResponse.json({
      success: true,
      message: 'Version saved successfully',
      savedVersion: currentVersionNum,
      newCurrentVersion: newVersionNum,
    });
  } catch (error) {
    console.error('Failed to save version:', error);
    return NextResponse.json(
      { error: 'Failed to save version', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Restore a specific version
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { versionNumber, modifiedBy } = body;

    if (!versionNumber) {
      return NextResponse.json(
        { error: 'Version number is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const collection = await Collection.findById(id);

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Find the version to restore
    const versionToRestore = collection.versions?.find(
      (v: { versionNumber: number }) => v.versionNumber === versionNumber
    );

    if (!versionToRestore) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Save current state before restoring
    const currentVersionNum = collection.currentVersion || 1;
    const currentSnapshot = {
      title: collection.title,
      combinedOcrText: collection.combinedOcrText,
      combinedAiText: collection.combinedAiText,
    };

    const newVersion = {
      versionNumber: currentVersionNum,
      changes: `Restored from version ${versionNumber}`,
      modifiedBy: modifiedBy || 'system',
      modifiedAt: new Date(),
      snapshot: currentSnapshot,
    };

    // Restore the old version's content
    await Collection.findByIdAndUpdate(id, {
      title: versionToRestore.snapshot.title || collection.title,
      combinedOcrText: versionToRestore.snapshot.combinedOcrText,
      combinedAiText: versionToRestore.snapshot.combinedAiText,
      $push: { versions: newVersion },
      currentVersion: currentVersionNum + 1,
    });

    return NextResponse.json({
      success: true,
      message: `Restored to version ${versionNumber}`,
      restoredFrom: versionNumber,
      newCurrentVersion: currentVersionNum + 1,
    });
  } catch (error) {
    console.error('Failed to restore version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

