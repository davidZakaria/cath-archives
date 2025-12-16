'use client';

import { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import CollectionUpload from '@/components/CollectionUpload';
import Link from 'next/link';

export default function HomePage() {
  const [uploadMode, setUploadMode] = useState<'single' | 'collection'>('collection');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" dir="rtl">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            أرشيف السينما العربية الرقمي
          </h1>
          <p className="text-lg text-amber-700 mb-6">
            نظام رقمنة ومراجعة المجلات والصحف السينمائية التاريخية
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/archive"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
            >
              تصفح الأرشيف
            </Link>
            <Link
              href="/review"
              className="px-6 py-3 bg-white hover:bg-gray-50 text-amber-900 rounded-lg font-medium border-2 border-amber-300 transition"
            >
              قائمة المراجعة
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white hover:bg-gray-50 text-amber-900 rounded-lg font-medium border-2 border-amber-300 transition"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>

        {/* Upload Mode Tabs */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center">
            <div className="inline-flex bg-white rounded-xl p-1 shadow-md">
              <button
                onClick={() => setUploadMode('collection')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  uploadMode === 'collection'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  رفع مجموعة (مقال كامل)
                </span>
              </button>
              <button
                onClick={() => setUploadMode('single')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  uploadMode === 'single'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-amber-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  رفع صور منفردة
                </span>
              </button>
            </div>
          </div>
          
          <p className="text-center text-amber-700 mt-4 text-sm">
            {uploadMode === 'collection' 
              ? '💡 ارفع جميع صفحات المقال معاً ليتم معالجتها وعرضها كمجموعة واحدة'
              : '💡 ارفع صور منفردة كل صورة تُعالج على حدة'
            }
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-12">
          {uploadMode === 'collection' ? (
            <CollectionUpload />
          ) : (
            <UploadZone />
          )}
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">📤</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">1. الرفع</h3>
            <p className="text-sm text-gray-600">
              ارفع صفحات المجلات والصحف السينمائية
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">2. OCR</h3>
            <p className="text-sm text-gray-600">
              استخراج النص تلقائياً باستخدام Google Vision
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">3. الذكاء الاصطناعي</h3>
            <p className="text-sm text-gray-600">
              تصحيح وتنسيق النص باستخدام GPT-4
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-3">✍️</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">4. المراجعة</h3>
            <p className="text-sm text-gray-600">
              مراجعة يدوية لضمان الدقة 100%
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold text-amber-900 mb-4">روابط سريعة</h2>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/movies" className="text-amber-600 hover:text-amber-800 hover:underline">
              الأفلام
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/characters" className="text-amber-600 hover:text-amber-800 hover:underline">
              الشخصيات
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/admin/categories" className="text-amber-600 hover:text-amber-800 hover:underline">
              إدارة التصنيفات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
