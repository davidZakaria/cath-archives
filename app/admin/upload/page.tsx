'use client';

import { useState } from 'react';
import CollectionUpload from '@/components/CollectionUpload';
import UploadZone from '@/components/UploadZone';
import { useLanguage } from '@/lib/i18n';

export default function AdminUploadPage() {
  const { t } = useLanguage();
  const [uploadMode, setUploadMode] = useState<'collection' | 'single'>('collection');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('upload.title')}</h1>
        <p className="text-slate-500 mt-1">{t('upload.subtitle')}</p>
      </div>

      {/* Upload Mode Tabs */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200 inline-flex">
        <button
          onClick={() => setUploadMode('collection')}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            uploadMode === 'collection'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {t('upload.collectionMode')}
        </button>
        <button
          onClick={() => setUploadMode('single')}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            uploadMode === 'single'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('upload.singleMode')}
        </button>
      </div>

      {/* Info Box */}
      <div className={`p-4 rounded-xl border ${
        uploadMode === 'collection' 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            uploadMode === 'collection' ? 'bg-blue-100' : 'bg-amber-100'
          }`}>
            {uploadMode === 'collection' ? '📚' : '🖼️'}
          </div>
          <div>
            <h3 className={`font-medium ${
              uploadMode === 'collection' ? 'text-blue-900' : 'text-amber-900'
            }`}>
              {uploadMode === 'collection' ? t('upload.collectionTitle') : t('upload.singleTitle')}
            </h3>
            <p className={`text-sm mt-1 ${
              uploadMode === 'collection' ? 'text-blue-700' : 'text-amber-700'
            }`}>
              {uploadMode === 'collection' ? t('upload.collectionDesc') : t('upload.singleDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Component */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {uploadMode === 'collection' ? (
          <CollectionUpload />
        ) : (
          <UploadZone />
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-4">{t('upload.howItWorks')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📤</span>
            </div>
            <h3 className="font-medium text-slate-900 mb-1">{t('upload.step1Title')}</h3>
            <p className="text-xs text-slate-500">{t('upload.step1Desc')}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">🔍</span>
            </div>
            <h3 className="font-medium text-slate-900 mb-1">{t('upload.step2Title')}</h3>
            <p className="text-xs text-slate-500">{t('upload.step2Desc')}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">✍️</span>
            </div>
            <h3 className="font-medium text-slate-900 mb-1">{t('upload.step3Title')}</h3>
            <p className="text-xs text-slate-500">{t('upload.step3Desc')}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">✨</span>
            </div>
            <h3 className="font-medium text-slate-900 mb-1">{t('upload.step4Title')}</h3>
            <p className="text-xs text-slate-500">{t('upload.step4Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
