'use client';

import { useState } from 'react';

export default function TestOCRPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testOCR = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Create a simple test image data URL (1x1 black pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('Test', 10, 30);
      }
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const formData = new FormData();
      formData.append('file', blob, 'test.png');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        
        // Wait a bit and check the document
        setTimeout(async () => {
          const docResponse = await fetch(`/api/documents/${data.document._id}`);
          const docData = await docResponse.json();
          setResult(docData.document);
        }, 5000);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">OCR Test Page</h1>
        
        <button
          onClick={testOCR}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OCR'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
            <h3 className="font-bold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-white border rounded">
            <h3 className="font-bold mb-2">Result:</h3>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Test OCR" button</li>
            <li>It will upload a simple test image</li>
            <li>After 5 seconds, it will check if OCR completed</li>
            <li>Check the result to see if ocrText field is populated</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

