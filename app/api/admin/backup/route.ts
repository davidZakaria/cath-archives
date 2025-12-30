// Admin API endpoint for backup and restore operations
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import Document from '@/models/Document';
import Movie from '@/models/Movie';
import Character from '@/models/Character';
import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const BACKUP_DIR = join(process.cwd(), 'backups');

interface BackupManifest {
  version: string;
  createdAt: string;
  collections: number;
  documents: number;
  movies: number;
  characters: number;
  totalSize: number;
}

// GET - List available backups or get backup status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'status') {
      // Get current database stats
      await connectDB();
      
      const [collectionsCount, documentsCount, moviesCount, charactersCount] = await Promise.all([
        Collection.countDocuments(),
        Document.countDocuments(),
        Movie.countDocuments(),
        Character.countDocuments(),
      ]);

      return NextResponse.json({
        success: true,
        status: {
          collections: collectionsCount,
          documents: documentsCount,
          movies: moviesCount,
          characters: charactersCount,
          lastBackup: await getLastBackupDate(),
        },
      });
    }

    // List available backups
    if (!existsSync(BACKUP_DIR)) {
      return NextResponse.json({
        success: true,
        backups: [],
      });
    }

    const files = await readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('backup-') && file.endsWith('.json')) {
        try {
          const manifestPath = join(BACKUP_DIR, file.replace('.json', '-manifest.json'));
          if (existsSync(manifestPath)) {
            const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as BackupManifest;
            backups.push({
              filename: file,
              ...manifest,
            });
          } else {
            backups.push({
              filename: file,
              createdAt: file.match(/backup-(\d+)/)?.[1] || 'unknown',
            });
          }
        } catch {
          // Skip invalid backup files
        }
      }
    }

    // Sort by date descending
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      backups,
      backupDir: BACKUP_DIR,
    });
  } catch (error) {
    console.error('Failed to get backup info:', error);
    return NextResponse.json(
      { error: 'Failed to get backup info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { includeEmbeddings = false, includeImages = false } = body;

    await connectDB();

    // Create backup directory if it doesn't exist
    await mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = Date.now();
    const backupFilename = `backup-${timestamp}.json`;
    const manifestFilename = `backup-${timestamp}-manifest.json`;

    console.log(`[Backup] Starting backup at ${new Date().toISOString()}...`);

    // Fetch all data
    const collectionsQuery = Collection.find().lean();
    const documentsQuery = Document.find().select('-ocrBlocks').lean(); // Exclude large binary data
    const moviesQuery = Movie.find().lean();
    const charactersQuery = Character.find().lean();

    // Optionally exclude embeddings (they can be regenerated)
    if (!includeEmbeddings) {
      collectionsQuery.select('-embedding');
    }

    const [collections, documents, movies, characters] = await Promise.all([
      collectionsQuery,
      documentsQuery,
      moviesQuery,
      charactersQuery,
    ]);

    console.log(`[Backup] Fetched: ${collections.length} collections, ${documents.length} documents, ${movies.length} movies, ${characters.length} characters`);

    // Create backup object
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        collections,
        documents,
        movies,
        characters,
      },
    };

    // Write backup file
    const backupJson = JSON.stringify(backup, null, 2);
    await writeFile(join(BACKUP_DIR, backupFilename), backupJson);

    // Create manifest
    const manifest: BackupManifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      collections: collections.length,
      documents: documents.length,
      movies: movies.length,
      characters: characters.length,
      totalSize: Buffer.byteLength(backupJson, 'utf8'),
    };

    await writeFile(join(BACKUP_DIR, manifestFilename), JSON.stringify(manifest, null, 2));

    console.log(`[Backup] Completed: ${backupFilename} (${formatBytes(manifest.totalSize)})`);

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        filename: backupFilename,
        ...manifest,
      },
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json(
      { error: 'Backup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Restore from a backup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, mode = 'merge' } = body; // mode: 'merge' or 'replace'

    if (!filename) {
      return NextResponse.json(
        { error: 'Backup filename is required' },
        { status: 400 }
      );
    }

    const backupPath = join(BACKUP_DIR, filename);
    
    if (!existsSync(backupPath)) {
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      );
    }

    console.log(`[Restore] Starting restore from ${filename} (mode: ${mode})...`);

    // Read backup file
    const backupJson = await readFile(backupPath, 'utf-8');
    const backup = JSON.parse(backupJson);

    if (!backup.data) {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      );
    }

    await connectDB();

    const stats = {
      collections: { inserted: 0, updated: 0 },
      documents: { inserted: 0, updated: 0 },
      movies: { inserted: 0, updated: 0 },
      characters: { inserted: 0, updated: 0 },
    };

    // Restore collections
    if (backup.data.collections?.length) {
      for (const collection of backup.data.collections) {
        try {
          if (mode === 'replace') {
            await Collection.findByIdAndUpdate(
              collection._id,
              collection,
              { upsert: true, new: true }
            );
            stats.collections.updated++;
          } else {
            // Merge mode - only insert if doesn't exist
            const existing = await Collection.findById(collection._id);
            if (!existing) {
              await Collection.create(collection);
              stats.collections.inserted++;
            }
          }
        } catch (err) {
          console.error(`Failed to restore collection ${collection._id}:`, err);
        }
      }
    }

    // Restore documents
    if (backup.data.documents?.length) {
      for (const document of backup.data.documents) {
        try {
          if (mode === 'replace') {
            await Document.findByIdAndUpdate(
              document._id,
              document,
              { upsert: true, new: true }
            );
            stats.documents.updated++;
          } else {
            const existing = await Document.findById(document._id);
            if (!existing) {
              await Document.create(document);
              stats.documents.inserted++;
            }
          }
        } catch (err) {
          console.error(`Failed to restore document ${document._id}:`, err);
        }
      }
    }

    // Restore movies
    if (backup.data.movies?.length) {
      for (const movie of backup.data.movies) {
        try {
          if (mode === 'replace') {
            await Movie.findByIdAndUpdate(
              movie._id,
              movie,
              { upsert: true, new: true }
            );
            stats.movies.updated++;
          } else {
            const existing = await Movie.findById(movie._id);
            if (!existing) {
              await Movie.create(movie);
              stats.movies.inserted++;
            }
          }
        } catch (err) {
          console.error(`Failed to restore movie ${movie._id}:`, err);
        }
      }
    }

    // Restore characters
    if (backup.data.characters?.length) {
      for (const character of backup.data.characters) {
        try {
          if (mode === 'replace') {
            await Character.findByIdAndUpdate(
              character._id,
              character,
              { upsert: true, new: true }
            );
            stats.characters.updated++;
          } else {
            const existing = await Character.findById(character._id);
            if (!existing) {
              await Character.create(character);
              stats.characters.inserted++;
            }
          }
        } catch (err) {
          console.error(`Failed to restore character ${character._id}:`, err);
        }
      }
    }

    console.log(`[Restore] Completed from ${filename}`);

    return NextResponse.json({
      success: true,
      message: 'Restore completed successfully',
      stats,
      restoredFrom: filename,
      backupDate: backup.createdAt,
    });
  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json(
      { error: 'Restore failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Backup filename is required' },
        { status: 400 }
      );
    }

    const backupPath = join(BACKUP_DIR, filename);
    const manifestPath = join(BACKUP_DIR, filename.replace('.json', '-manifest.json'));

    if (!existsSync(backupPath)) {
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      );
    }

    // Delete backup and manifest
    const { unlink } = await import('fs/promises');
    await unlink(backupPath);
    if (existsSync(manifestPath)) {
      await unlink(manifestPath);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully',
      filename,
    });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json(
      { error: 'Failed to delete backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getLastBackupDate(): Promise<string | null> {
  try {
    if (!existsSync(BACKUP_DIR)) return null;
    
    const files = await readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json') && !f.includes('manifest'));
    
    if (backupFiles.length === 0) return null;
    
    // Sort by timestamp in filename
    backupFiles.sort((a, b) => {
      const aTime = parseInt(a.match(/backup-(\d+)/)?.[1] || '0');
      const bTime = parseInt(b.match(/backup-(\d+)/)?.[1] || '0');
      return bTime - aTime;
    });
    
    const latestFile = backupFiles[0];
    const manifestPath = join(BACKUP_DIR, latestFile.replace('.json', '-manifest.json'));
    
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
      return manifest.createdAt;
    }
    
    // Fallback to timestamp from filename
    const timestamp = parseInt(latestFile.match(/backup-(\d+)/)?.[1] || '0');
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

