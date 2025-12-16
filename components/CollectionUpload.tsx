'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MovieCharacterSelector from './MovieCharacterSelector';

interface CollectionStatus {
  _id: string;
  title: string;
  totalPages: number;
  ocrCompletedPages: number;
  processingStatus: string;
}

interface SelectedEntity {
  id: string;
  type: 'movie' | 'character';
  arabicName: string;
  englishName?: string;
  extra?: string;
}

export default function CollectionUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Poll for collection status
  useEffect(() => {
    if (!collectionStatus || collectionStatus.processingStatus === 'completed') return;

    const interval = setInterval(async () => {
      try {
        // Use statusOnly=true for faster polling without heavy populate
        const response = await fetch(`/api/collections/${collectionStatus._id}?statusOnly=true`);
        if (response.ok) {
          const data = await response.json();
          setCollectionStatus({
            _id: data.collection._id,
            title: data.collection.title,
            totalPages: data.collection.totalPages,
            ocrCompletedPages: data.collection.ocrCompletedPages,
            processingStatus: data.collection.processingStatus,
          });

          if (data.collection.processingStatus === 'completed') {
            clearInterval(interval);
            // Redirect to admin review page after 1 second
            setTimeout(() => {
              router.push(`/admin/review/${data.collection._id}`);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [collectionStatus, router]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      // Sort files by name to maintain page order
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setSelectedFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setSelectedFiles(fileArray);
    }
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === selectedFiles.length - 1)
    ) {
      return;
    }

    const newFiles = [...selectedFiles];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
    setSelectedFiles(newFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('title', title || `مجموعة ${new Date().toLocaleDateString('ar-EG')}`);
      
      // Add linked entity info if selected
      if (selectedEntity) {
        formData.append('linkType', selectedEntity.type);
        if (selectedEntity.type === 'movie') {
          formData.append('linkedMovie', selectedEntity.id);
        } else {
          formData.append('linkedCharacter', selectedEntity.id);
        }
      }
      
      // Append files in order
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      setProgress(30);

      const response = await fetch('/api/collections', {
        method: 'POST',
        body: formData,
      });

      setProgress(60);

      if (response.ok) {
        const data = await response.json();
        setCollectionStatus({
          _id: data.collection._id,
          title: data.collection.title,
          totalPages: data.collection.totalPages,
          ocrCompletedPages: 0,
          processingStatus: 'processing_ocr',
        });
        setProgress(100);
      } else {
        const error = await response.json();
        alert(`فشل الرفع: ${error.error}`);
        setUploading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('حدث خطأ أثناء الرفع');
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setTitle('');
    setSelectedEntity(null);
    setUploading(false);
    setProgress(0);
    setCollectionStatus(null);
  };

  // Show processing status
  if (collectionStatus) {
    const ocrProgress = collectionStatus.totalPages > 0 
      ? Math.round((collectionStatus.ocrCompletedPages / collectionStatus.totalPages) * 100)
      : 0;

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center" dir="rtl">
          <div className="mb-6">
            {collectionStatus.processingStatus === 'completed' ? (
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {collectionStatus.processingStatus === 'completed' ? 'تم بنجاح!' : 'جاري المعالجة...'}
          </h2>
          
          <p className="text-gray-600 mb-4">{collectionStatus.title}</p>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>OCR: {collectionStatus.ocrCompletedPages} / {collectionStatus.totalPages} صفحة</span>
              <span>{ocrProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  collectionStatus.processingStatus === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>

          {collectionStatus.processingStatus === 'completed' && (
            <p className="text-green-600 mb-4">جاري التوجيه لصفحة المراجعة...</p>
          )}

          <button
            onClick={resetUpload}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            رفع مجموعة جديدة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto" dir="rtl">
      {/* Title Input */}
      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-700 mb-2">
          عنوان المجموعة (اختياري)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: مقال عن فيلم الناصر صلاح الدين"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
          disabled={uploading}
        />
      </div>

      {/* Movie/Character Selector */}
      <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
        <label className="block text-lg font-medium text-gray-700 mb-3">
          ربط المقال بـ فيلم أو شخصية
        </label>
        <p className="text-sm text-gray-500 mb-4">
          اختر الفيلم أو الشخصية التي يتحدث عنها هذا المقال
        </p>
        <MovieCharacterSelector
          onSelect={(item) => setSelectedEntity(item)}
          initialValue={selectedEntity}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-4 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-white'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-amber-400'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="text-gray-600">
            <p className="text-lg font-medium">اسحب صفحات المقال هنا</p>
            <p className="text-sm text-gray-500 mt-1">أو اضغط لاختيار الملفات</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              disabled={uploading}
            >
              اختيار الصور
            </button>
          </div>
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              الصفحات المحددة ({selectedFiles.length})
            </h3>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              حذف الكل
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            رتّب الصفحات بالترتيب الصحيح باستخدام الأسهم
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-medium text-sm">
                  {index + 1}
                </span>
                
                <span className="flex-1 truncate text-gray-700">{file.name}</span>
                
                <span className="text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === selectedFiles.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="mt-6 w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-lg font-semibold rounded-lg hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                جاري الرفع... {progress}%
              </span>
            ) : (
              `رفع ${selectedFiles.length} صفحة كمجموعة واحدة`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
