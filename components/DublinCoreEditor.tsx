'use client';

import { useState, useEffect } from 'react';

interface DublinCoreMetadata {
  title?: string;
  creator?: string[];
  subject?: string[];
  description?: string;
  publisher?: string;
  contributor?: string[];
  date?: string;
  type?: string;
  format?: string;
  identifier?: string;
  source?: string;
  language?: string;
  relation?: string[];
  coverage?: string;
  rights?: string;
}

interface DublinCoreEditorProps {
  collectionId: string;
  initialData?: DublinCoreMetadata;
  language?: 'ar' | 'en';
  onSave?: (data: DublinCoreMetadata) => void;
  readOnly?: boolean;
}

const DC_TYPES = [
  'Collection', 'Dataset', 'Event', 'Image', 'InteractiveResource',
  'MovingImage', 'PhysicalObject', 'Service', 'Software', 'Sound',
  'StillImage', 'Text',
];

const LANGUAGES = [
  { code: 'ar', name: { ar: 'العربية', en: 'Arabic' } },
  { code: 'en', name: { ar: 'الإنجليزية', en: 'English' } },
  { code: 'fr', name: { ar: 'الفرنسية', en: 'French' } },
];

export default function DublinCoreEditor({
  collectionId,
  initialData,
  language = 'ar',
  onSave,
  readOnly = false,
}: DublinCoreEditorProps) {
  const [metadata, setMetadata] = useState<DublinCoreMetadata>(initialData || {
    language: 'ar',
    type: 'Text',
    format: 'application/pdf',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const texts = {
    title: { ar: 'بيانات Dublin Core', en: 'Dublin Core Metadata' },
    save: { ar: 'حفظ', en: 'Save' },
    saving: { ar: 'جاري الحفظ...', en: 'Saving...' },
    saved: { ar: 'تم الحفظ', en: 'Saved' },
    export: { ar: 'تصدير XML', en: 'Export XML' },
    fields: {
      title: { ar: 'العنوان', en: 'Title' },
      creator: { ar: 'المنشئ/المؤلف', en: 'Creator' },
      subject: { ar: 'الموضوع', en: 'Subject' },
      description: { ar: 'الوصف', en: 'Description' },
      publisher: { ar: 'الناشر', en: 'Publisher' },
      contributor: { ar: 'المساهم', en: 'Contributor' },
      date: { ar: 'التاريخ', en: 'Date' },
      type: { ar: 'النوع', en: 'Type' },
      format: { ar: 'الصيغة', en: 'Format' },
      identifier: { ar: 'المعرف', en: 'Identifier' },
      source: { ar: 'المصدر', en: 'Source' },
      language: { ar: 'اللغة', en: 'Language' },
      relation: { ar: 'العلاقة', en: 'Relation' },
      coverage: { ar: 'التغطية', en: 'Coverage' },
      rights: { ar: 'الحقوق', en: 'Rights' },
    },
    hints: {
      creator: { ar: 'فصل بين الأسماء بفاصلة', en: 'Separate names with commas' },
      subject: { ar: 'كلمات مفتاحية، فصل بفاصلة', en: 'Keywords, separate with commas' },
      date: { ar: 'YYYY-MM-DD', en: 'YYYY-MM-DD' },
      identifier: { ar: 'رقم فريد (مثل ISBN, URI)', en: 'Unique ID (e.g., ISBN, URI)' },
    },
  };

  const t = (key: keyof typeof texts) => {
    const value = texts[key];
    if (typeof value === 'object' && 'ar' in value && 'en' in value) {
      return (value as { ar: string; en: string })[language];
    }
    return '';
  };

  const tf = (field: keyof typeof texts.fields) => texts.fields[field][language];
  const th = (field: keyof typeof texts.hints) => texts.hints[field][language];

  const handleArrayField = (field: 'creator' | 'subject' | 'contributor' | 'relation', value: string) => {
    const array = value.split(',').map(s => s.trim()).filter(s => s);
    setMetadata({ ...metadata, [field]: array });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dublinCore: metadata }),
      });

      if (response.ok) {
        setSaved(true);
        onSave?.(metadata);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save Dublin Core metadata:', error);
    } finally {
      setSaving(false);
    }
  };

  const exportXML = () => {
    const xml = generateDublinCoreXML(metadata);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dublin-core-${collectionId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#2a2318] rounded-xl border border-[#3a3020]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="p-4 border-b border-[#3a3020] flex items-center justify-between">
        <h3 className="font-bold text-[#d4a012] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('title')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={exportXML}
            className="px-3 py-1 text-sm bg-[#3a3020] text-[#d4c4a8] rounded hover:bg-[#4a4030] transition-colors"
          >
            {t('export')}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-1 text-sm rounded transition-colors ${
                saved
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-[#d4a012] text-[#1a1510] hover:bg-[#e4b022]'
              } disabled:opacity-50`}
            >
              {saving ? t('saving') : saved ? t('saved') : t('save')}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('title')}</label>
          <input
            type="text"
            value={metadata.title || ''}
            onChange={(e) => { setMetadata({ ...metadata, title: e.target.value }); setSaved(false); }}
            disabled={readOnly}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Creator (array) */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('creator')}</label>
          <input
            type="text"
            value={(metadata.creator || []).join(', ')}
            onChange={(e) => handleArrayField('creator', e.target.value)}
            disabled={readOnly}
            placeholder={th('creator')}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] placeholder-[#5a4530] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Subject (array) */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('subject')}</label>
          <input
            type="text"
            value={(metadata.subject || []).join(', ')}
            onChange={(e) => handleArrayField('subject', e.target.value)}
            disabled={readOnly}
            placeholder={th('subject')}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] placeholder-[#5a4530] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('description')}</label>
          <textarea
            value={metadata.description || ''}
            onChange={(e) => { setMetadata({ ...metadata, description: e.target.value }); setSaved(false); }}
            disabled={readOnly}
            rows={3}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Publisher */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('publisher')}</label>
            <input
              type="text"
              value={metadata.publisher || ''}
              onChange={(e) => { setMetadata({ ...metadata, publisher: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('date')}</label>
            <input
              type="date"
              value={metadata.date || ''}
              onChange={(e) => { setMetadata({ ...metadata, date: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('type')}</label>
            <select
              value={metadata.type || ''}
              onChange={(e) => { setMetadata({ ...metadata, type: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            >
              {DC_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('language')}</label>
            <select
              value={metadata.language || 'ar'}
              onChange={(e) => { setMetadata({ ...metadata, language: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name[language]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Source */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('source')}</label>
            <input
              type="text"
              value={metadata.source || ''}
              onChange={(e) => { setMetadata({ ...metadata, source: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Identifier */}
          <div>
            <label className="block text-sm text-[#7a6545] mb-1">{tf('identifier')}</label>
            <input
              type="text"
              value={metadata.identifier || ''}
              onChange={(e) => { setMetadata({ ...metadata, identifier: e.target.value }); setSaved(false); }}
              disabled={readOnly}
              placeholder={th('identifier')}
              className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] placeholder-[#5a4530] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Rights */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('rights')}</label>
          <input
            type="text"
            value={metadata.rights || ''}
            onChange={(e) => { setMetadata({ ...metadata, rights: e.target.value }); setSaved(false); }}
            disabled={readOnly}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Coverage */}
        <div>
          <label className="block text-sm text-[#7a6545] mb-1">{tf('coverage')}</label>
          <input
            type="text"
            value={metadata.coverage || ''}
            onChange={(e) => { setMetadata({ ...metadata, coverage: e.target.value }); setSaved(false); }}
            disabled={readOnly}
            className="w-full px-3 py-2 bg-[#1a1510] border border-[#3a3020] rounded-lg text-[#d4c4a8] focus:border-[#d4a012] focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Generate Dublin Core XML from metadata
 */
function generateDublinCoreXML(metadata: DublinCoreMetadata): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
  ];

  const addElement = (name: string, value: string | string[] | undefined) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v) lines.push(`  <dc:${name}>${escapeXML(v)}</dc:${name}>`);
      });
    } else {
      lines.push(`  <dc:${name}>${escapeXML(value)}</dc:${name}>`);
    }
  };

  addElement('title', metadata.title);
  addElement('creator', metadata.creator);
  addElement('subject', metadata.subject);
  addElement('description', metadata.description);
  addElement('publisher', metadata.publisher);
  addElement('contributor', metadata.contributor);
  addElement('date', metadata.date);
  addElement('type', metadata.type);
  addElement('format', metadata.format);
  addElement('identifier', metadata.identifier);
  addElement('source', metadata.source);
  addElement('language', metadata.language);
  addElement('relation', metadata.relation);
  addElement('coverage', metadata.coverage);
  addElement('rights', metadata.rights);

  lines.push('</metadata>');
  return lines.join('\n');
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

