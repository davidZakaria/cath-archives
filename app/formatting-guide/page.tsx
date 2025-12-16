export default function FormattingGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">✨ Smart Text Formatting Guide</h1>

        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">
            🎉 New Feature Activated!
          </h2>
          <p className="text-green-700">
            Your OCR now automatically detects and formats document structure - titles, subtitles, paragraphs, dialogues, and lists!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 How It Works</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-blue-600 mb-2">1. Title Detection</h3>
              <p className="text-gray-700 mb-2">
                Automatically identifies main titles (usually at the top, short text, larger font)
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="font-bold text-blue-900 mb-1">Formatted as:</p>
                <code className="text-sm bg-blue-100 px-2 py-1 rounded"># Title Text</code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-green-600 mb-2">2. Subtitle Detection</h3>
              <p className="text-gray-700 mb-2">
                Identifies section headings (medium-sized, moderate length)
              </p>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="font-bold text-green-900 mb-1">Formatted as:</p>
                <code className="text-sm bg-green-100 px-2 py-1 rounded">## Subtitle Text</code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-purple-600 mb-2">3. Dialogue Detection</h3>
              <p className="text-gray-700 mb-2">
                Identifies quoted text or dialogues (indented text, quotation marks)
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="font-bold text-purple-900 mb-1">Formatted as:</p>
                <code className="text-sm bg-purple-100 px-2 py-1 rounded">&gt; Dialogue text</code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-amber-600 mb-2">4. List Detection</h3>
              <p className="text-gray-700 mb-2">
                Identifies bullet points and numbered lists
              </p>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <p className="font-bold text-amber-900 mb-1">Formatted as:</p>
                <code className="text-sm bg-amber-100 px-2 py-1 rounded">• List item</code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-600 mb-2">5. Section Breaks</h3>
              <p className="text-gray-700 mb-2">
                Automatically adds spacing between major sections based on layout gaps
              </p>
              <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded">
                <p className="font-bold text-gray-900 mb-1">Added automatically:</p>
                <code className="text-sm bg-gray-200 px-2 py-1 rounded">---</code>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">🎯 Example Output</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2 text-red-600">❌ Before (Unformatted)</h3>
              <div className="bg-gray-100 p-4 rounded text-sm">
                <pre className="whitespace-pre-wrap font-arabic" dir="rtl">
كتاب القانون في حياة علماء مع مصطلح وكان الهدف فيه خاصة أجملاته واعتبارات وكان القائد الشرفي يشرف
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2 text-green-600">✅ After (Formatted)</h3>
              <div className="bg-green-50 p-4 rounded text-sm">
                <pre className="whitespace-pre-wrap font-arabic" dir="rtl">
{`# كتاب القانون

## في حياة علماء مع مصطلح

وكان الهدف فيه خاصة أجملاته واعتبارات

وكان القائد الشرفي يشرف`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-blue-800">💡 Benefits</h2>
          <ul className="space-y-2 text-gray-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Better Readability:</strong> Clear visual hierarchy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Preserves Structure:</strong> Maintains document organization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Easier Editing:</strong> Quickly identify different text types</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Professional Output:</strong> Clean, organized transcriptions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span><strong>Automatic:</strong> No manual formatting needed!</span>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-yellow-800">📝 Editing Tips</h2>
          <ul className="space-y-2 text-gray-800">
            <li>• You can edit the formatted text freely in the editor</li>
            <li>• The formatting markers (#, ##, >, •) are just visual guides</li>
            <li>• Remove or add formatting markers as needed</li>
            <li>• The original unformatted text is always available (click "Show Original OCR")</li>
            <li>• Formatting is applied automatically on every new upload</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-4">
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            Upload New Document
          </a>
          <a
            href="/review"
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
          >
            Review Queue
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

