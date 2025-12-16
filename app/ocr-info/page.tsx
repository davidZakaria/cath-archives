export default function OCRInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📝 OCR System Information</h1>

        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">
            ✅ Now Using: Tesseract.js (Free OCR)
          </h2>
          <p className="text-green-700">
            Your system is now using Tesseract.js - a completely free, open-source OCR engine that runs without any API keys or billing!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-3 text-green-600">✅ Advantages</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ 100% Free - no costs ever</li>
              <li>✓ No API keys needed</li>
              <li>✓ No billing setup required</li>
              <li>✓ Works offline</li>
              <li>✓ Privacy - all processing local</li>
              <li>✓ Good for printed Arabic text (70-80%)</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-3 text-orange-600">⚠️ Limitations</h3>
            <ul className="space-y-2 text-sm">
              <li>⚠ Slower processing (15-30 seconds)</li>
              <li>⚠ Lower accuracy for handwritten (30-50%)</li>
              <li>⚠ Best for printed text, not manuscripts</li>
              <li>⚠ May require more manual corrections</li>
              <li>⚠ Less confident with complex layouts</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-lg mb-3">📊 Expected Accuracy</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Printed Arabic Text:</strong> 70-80% accuracy</p>
            <p><strong>Handwritten Arabic:</strong> 30-50% accuracy</p>
            <p><strong>Mixed/Complex Pages:</strong> 40-60% accuracy</p>
            <p className="text-blue-700 mt-3">
              💡 <strong>Tip:</strong> Manual review will still be essential for 100% accuracy!
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-lg mb-3">🚀 How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Upload your manuscript images as usual</li>
            <li>OCR will process automatically (takes 15-30 seconds)</li>
            <li>Or use Admin Tools page to manually trigger OCR</li>
            <li>Review and correct the extracted text</li>
            <li>Mark as completed when verified</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3">🔄 Switching to Google Cloud Vision Later</h3>
          <p className="text-sm mb-3">
            If you need better accuracy (especially for handwritten text), you can switch to Google Cloud Vision API:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>85-95% accuracy for handwritten Arabic</li>
            <li>$300 in free credits</li>
            <li>1,000 free requests/month after that</li>
            <li>Much faster processing (5-10 seconds)</li>
          </ul>
          <p className="text-sm mt-3 text-yellow-700">
            💡 You can test with Tesseract first, then upgrade to Google Cloud if needed.
          </p>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload Documents
          </a>
          <a
            href="/admin-tools"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Admin Tools
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

