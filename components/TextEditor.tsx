'use client';

import { useState, useEffect, useRef } from 'react';

interface TextEditorProps {
  initialText: string;
  onChange: (text: string, correctionsCount: number) => void;
  originalOcrText?: string;
}

export default function TextEditor({ initialText, onChange, originalOcrText }: TextEditorProps) {
  const [text, setText] = useState(initialText);
  const [showOriginal, setShowOriginal] = useState(false);
  const [corrections, setCorrections] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextRef = useRef(initialText);

  useEffect(() => {
    setText(initialText);
    initialTextRef.current = initialText;
    setCorrections(0);
  }, [initialText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    // Simple correction counter (count characters changed)
    const changes = Math.abs(newText.length - initialTextRef.current.length);
    setCorrections(changes);
    
    onChange(newText, changes);
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-700 font-medium">
            📝 Words: <span className="font-bold text-blue-700">{wordCount}</span>
          </span>
          <span className="text-gray-700 font-medium">
            🔤 Characters: <span className="font-bold text-blue-700">{charCount}</span>
          </span>
          <span className="text-gray-700 font-medium">
            ✏️ Corrections: <span className="font-bold text-orange-600">{corrections}</span>
          </span>
        </div>
        
        {originalOcrText && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="px-4 py-2 text-sm font-medium bg-white hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-400 rounded-lg transition-all shadow-sm"
          >
            {showOriginal ? '👁️ Hide' : '👁️ Show'} Original OCR
          </button>
        )}
      </div>

      {/* Original OCR Text (if showing) */}
      {showOriginal && originalOcrText && (
        <div className="p-6 bg-amber-50 border-b-2 border-amber-200 max-h-64 overflow-y-auto">
          <p className="text-sm font-bold text-amber-800 mb-3">📋 Original OCR Text (Read-Only):</p>
          <p 
            className="text-lg text-gray-900 whitespace-pre-wrap font-arabic leading-relaxed"
            dir="rtl"
            style={{ 
              fontFamily: 'Noto Naskh Arabic, Arial, sans-serif',
              fontSize: '20px',
              lineHeight: '2.2'
            }}
          >
            {originalOcrText}
          </p>
        </div>
      )}

      {/* Text Editor */}
      <div className="flex-1 p-6 bg-gray-50">
        <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
          <span className="font-medium">✨ Smart Formatting Active:</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            # Title
          </span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            ## Subtitle
          </span>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            &gt; Dialogue
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          className="w-full h-full resize-none border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-6 text-xl font-arabic bg-white shadow-sm"
          dir="rtl"
          placeholder="النص العربي سيظهر هنا بعد معالجة OCR... (مع تنسيق تلقائي للعناوين والفقرات)"
          style={{
            fontFamily: 'Noto Naskh Arabic, Arial, sans-serif',
            lineHeight: '2.5',
            color: '#1a1a1a',
            fontSize: '22px',
            whiteSpace: 'pre-wrap', // Preserve line breaks and spacing
          }}
        />
      </div>

      {/* Footer Instructions */}
      <div className="p-3 bg-blue-50 border-t-2 border-blue-200 text-sm text-gray-700">
        <p className="font-medium">💡 <strong>Tip:</strong> Edit the text to correct any OCR errors. Changes are auto-saved every 30 seconds.</p>
      </div>
    </div>
  );
}

