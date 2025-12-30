'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UploadResult {
  success: boolean;
  filename: string;
  documentId?: string;
  error?: string;
}

interface BatchStatus {
  batchId: string;
  status: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  progress: number;
}

export default function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Poll batch status when we have an active batch
  useEffect(() => {
    if (!currentBatchId || !uploading) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch-status/${currentBatchId}`);
        if (response.ok) {
          const data = await response.json();
          setBatchStatus(data.batch);
          
          // Check if batch is complete
          if (['completed', 'failed', 'cancelled'].includes(data.batch.status)) {
            setUploading(false);
            clearInterval(pollInterval);
            
            // Redirect to review queue after 2 seconds
            setTimeout(() => {
              router.push('/review');
              router.refresh();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to fetch batch status:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [currentBatchId, uploading, router]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Handle both files and folders
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        if (item.isFile) {
          const file = e.dataTransfer.files[i];
          if (file.type.startsWith('image/')) {
            files.push(file);
          }
        } else if (item.isDirectory) {
          const dirFiles = await readDirectory(item as FileSystemDirectoryEntry);
          files.push(...dirFiles);
        }
      }
    }

    if (files.length > 0) {
      if (files.length > 1) {
        setUploadMode('batch');
        setSelectedFiles(files);
      } else {
        await uploadFiles(files);
      }
    }
  }, []);

  // Recursively read directory contents
  const readDirectory = async (directoryEntry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = directoryEntry.createReader();

    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    const getFile = (fileEntry: FileSystemFileEntry): Promise<File> => {
      return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
    };

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await getFile(entry as FileSystemFileEntry);
          if (file.type.startsWith('image/')) {
            files.push(file);
          }
        } else if (entry.isDirectory) {
          const subFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }

    return files;
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (fileArray.length > 5) {
        setUploadMode('batch');
        setSelectedFiles(fileArray);
      } else {
        await uploadFiles(fileArray);
      }
    }
  }, []);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
      setUploadMode('batch');
      setSelectedFiles(fileArray);
    }
  }, []);

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    // Use batch upload for multiple files
    if (files.length > 1) {
      await uploadBatch(files);
      return;
    }

    // Single file upload (existing behavior)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setUploadResults((prev) => [...prev, { 
            success: true, 
            filename: file.name,
            documentId: data.document._id,
          }]);
        } else {
          const error = await response.json();
          setUploadResults((prev) => [...prev, { 
            success: false, 
            filename: file.name,
            error: error.error,
          }]);
        }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (error) {
        console.error('Upload error:', error);
        setUploadResults((prev) => [...prev, { 
          success: false, 
          filename: file.name,
          error: 'Network error',
        }]);
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    
    // Redirect to review queue after successful upload
    if (files.length > 0) {
      setTimeout(() => {
        router.push('/review');
        router.refresh();
      }, 1500);
    }
  };

  const uploadBatch = async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      setUploadProgress(10); // Initial progress for upload start

      const response = await fetch('/api/batch-upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBatchId(data.batchId);
        setUploadProgress(50); // Upload complete, now processing
        
        // Results will be updated via polling
        setUploadResults(data.results.map((r: UploadResult) => ({
          success: r.success,
          filename: r.filename,
          documentId: r.documentId,
          error: r.error,
        })));
      } else {
        const error = await response.json();
        console.error('Batch upload failed:', error);
        setUploading(false);
        alert(`Batch upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      setUploading(false);
      alert('Batch upload failed. Please try again.');
    }
    
    setSelectedFiles([]);
  };

  const startBatchUpload = async () => {
    if (selectedFiles.length > 0) {
      await uploadFiles(selectedFiles);
    }
  };

  const cancelSelection = () => {
    setSelectedFiles([]);
    setUploadMode('single');
  };

  const cancelBatch = async () => {
    if (currentBatchId) {
      try {
        await fetch(`/api/batch-status/${currentBatchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        });
        setUploading(false);
        setCurrentBatchId(null);
        setBatchStatus(null);
      } catch (error) {
        console.error('Failed to cancel batch:', error);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* File Selection Preview */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-blue-900">
              {selectedFiles.length} images selected for batch upload
            </h3>
            <div className="space-x-2">
              <button
                onClick={cancelSelection}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={startBatchUpload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Upload
              </button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto text-sm text-gray-600">
            {selectedFiles.slice(0, 10).map((file, i) => (
              <div key={i} className="truncate">{file.name}</div>
            ))}
            {selectedFiles.length > 10 && (
              <div className="text-gray-500 mt-1">
                ... and {selectedFiles.length - 10} more files
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-4 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-blue-400'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <input
          ref={folderInputRef}
          type="file"
          id="folder-upload"
          // @ts-expect-error - webkitdirectory is not in React types
          webkitdirectory=""
          directory=""
          onChange={handleFolderSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-gray-600">
            {uploading ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {batchStatus 
                    ? `Processing: ${batchStatus.completedFiles}/${batchStatus.totalFiles} completed`
                    : 'Uploading...'}
                </p>
                {batchStatus && (
                  <p className="text-sm text-gray-500">
                    {batchStatus.failedFiles > 0 && `${batchStatus.failedFiles} failed • `}
                    Status: {batchStatus.status}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-lg font-medium">
                  Drop Arabic cinema archive images here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or use the buttons below to select files
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Select Images
                  </label>
                  <label
                    htmlFor="folder-upload"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Select Folder
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Supported formats: JPG, PNG, TIFF • Batch upload supported
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              {batchStatus 
                ? `${batchStatus.progress}% complete`
                : `${uploadProgress}%`}
            </span>
            {currentBatchId && (
              <button
                onClick={cancelBatch}
                className="text-red-600 hover:text-red-700"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                batchStatus?.failedFiles ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${batchStatus?.progress || uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && !uploading && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Upload Results</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {uploadResults.map((result, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className="truncate flex-1 text-sm">
                  {result.filename}
                </span>
                <span className={`text-sm font-medium ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.success ? '✓ Uploaded' : `✗ ${result.error}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {uploadResults.filter(r => r.success).length} of {uploadResults.length} files uploaded successfully
          </div>
        </div>
      )}
    </div>
  );
}
