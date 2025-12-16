'use client';

import { useState, useEffect } from 'react';

export default function AdminToolsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryOCR = async (id: string) => {
    setRetryingId(id);
    setResult(null);
    
    try {
      const response = await fetch(`/api/retry-ocr/${id}`);
      const data = await response.json();
      setResult(data);
      
      // Refresh documents list
      await fetchDocuments();
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Tools - OCR Management</h1>

        {result && (
          <div className={`mb-6 p-4 rounded border ${result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <h3 className="font-bold mb-2">
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Filename</th>
                <th className="px-4 py-3 text-left">OCR Status</th>
                <th className="px-4 py-3 text-left">Confidence</th>
                <th className="px-4 py-3 text-left">Text Length</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{doc.filename}</td>
                  <td className="px-4 py-3">
                    {doc.ocrText && doc.ocrText.length > 0 ? (
                      <span className="text-green-600 font-medium">✓ Completed</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">⏳ Not Processed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {doc.ocrConfidence > 0 
                      ? `${Math.round(doc.ocrConfidence * 100)}%` 
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {doc.ocrText?.length || 0} chars
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => retryOCR(doc._id)}
                      disabled={retryingId === doc._id}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {retryingId === doc._id ? 'Processing...' : 'Run OCR'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {documents.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No documents found. Upload some documents first!
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold mb-2">About This Tool:</h3>
          <ul className="text-sm space-y-1">
            <li>• This page shows all uploaded documents</li>
            <li>• Click "Run OCR" to process or re-process a document</li>
            <li>• Watch for success/error messages above</li>
            <li>• Check your terminal for detailed OCR logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

