'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

// All translations for the admin dashboard
export const translations: Translations = {
  // Navigation
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.upload': { ar: 'رفع وثائق', en: 'Upload' },
  'nav.import': { ar: 'استيراد TMDB', en: 'Import TMDB' },
  'nav.collections': { ar: 'المجموعات', en: 'Collections' },
  'nav.review': { ar: 'المراجعة', en: 'Review' },
  'nav.ocrQueue': { ar: 'طابور OCR', en: 'OCR Queue' },
  'nav.categories': { ar: 'التصنيفات', en: 'Categories' },
  'nav.settings': { ar: 'الإعدادات', en: 'Settings' },
  
  // Header
  'header.title': { ar: 'سينما زمان', en: 'Cinema Zaman' },
  'header.subtitle': { ar: 'لوحة التحكم', en: 'Admin Panel' },
  'header.uploadDocs': { ar: 'رفع وثائق', en: 'Upload' },
  'header.viewSite': { ar: 'عرض الموقع', en: 'View Site' },
  'header.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'header.loggingOut': { ar: 'جاري الخروج...', en: 'Logging out...' },
  
  // Dashboard
  'dashboard.title': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'dashboard.subtitle': { ar: 'نظرة عامة على نظام الأرشفة', en: 'Archive system overview' },
  'dashboard.totalCollections': { ar: 'إجمالي المجموعات', en: 'Total Collections' },
  'dashboard.totalDocuments': { ar: 'إجمالي الوثائق', en: 'Total Documents' },
  'dashboard.processingQueue': { ar: 'طابور المعالجة', en: 'Processing Queue' },
  'dashboard.avgOcrAccuracy': { ar: 'متوسط دقة OCR', en: 'Avg OCR Accuracy' },
  'dashboard.published': { ar: 'منشور', en: 'Published' },
  'dashboard.inReview': { ar: 'في المراجعة', en: 'In Review' },
  'dashboard.draft': { ar: 'مسودة', en: 'Draft' },
  'dashboard.completed': { ar: 'مكتمل', en: 'Completed' },
  'dashboard.inProgress': { ar: 'قيد العمل', en: 'In Progress' },
  'dashboard.pending': { ar: 'في الانتظار', en: 'Pending' },
  'dashboard.failed': { ar: 'فشل', en: 'Failed' },
  'dashboard.noErrors': { ar: 'لا يوجد أخطاء', en: 'No errors' },
  'dashboard.quickActions': { ar: 'إجراءات سريعة', en: 'Quick Actions' },
  'dashboard.uploadNew': { ar: 'رفع مجموعة جديدة', en: 'Upload New Collection' },
  'dashboard.reviewPending': { ar: 'مراجعة', en: 'Review' },
  'dashboard.waitingReview': { ar: 'في الانتظار', en: 'waiting' },
  'dashboard.manageCollections': { ar: 'إدارة المجموعات', en: 'Manage Collections' },
  'dashboard.recentCollections': { ar: 'أحدث المجموعات', en: 'Recent Collections' },
  'dashboard.viewAll': { ar: 'عرض الكل', en: 'View All' },
  'dashboard.noCollections': { ar: 'لا توجد مجموعات حتى الآن', en: 'No collections yet' },
  'dashboard.pages': { ar: 'صفحة', en: 'pages' },
  'dashboard.systemStatus': { ar: 'حالة النظام', en: 'System Status' },
  'dashboard.database': { ar: 'قاعدة البيانات', en: 'Database' },
  'dashboard.connected': { ar: 'متصل', en: 'Connected' },
  'dashboard.active': { ar: 'فعال', en: 'Active' },
  'dashboard.storage': { ar: 'التخزين', en: 'Storage' },
  'dashboard.available': { ar: 'متاح', en: 'Available' },
  'dashboard.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  
  // Upload page
  'upload.title': { ar: 'رفع الوثائق', en: 'Upload Documents' },
  'upload.subtitle': { ar: 'رفع صفحات المجلات والصحف السينمائية للأرشفة', en: 'Upload magazine and newspaper pages for archiving' },
  'upload.collectionMode': { ar: 'رفع مجموعة (مقال)', en: 'Upload Collection (Article)' },
  'upload.singleMode': { ar: 'صور منفردة', en: 'Single Images' },
  'upload.collectionTitle': { ar: 'رفع مجموعة صفحات', en: 'Upload Page Collection' },
  'upload.singleTitle': { ar: 'رفع صور منفردة', en: 'Upload Single Images' },
  'upload.collectionDesc': { ar: 'ارفع جميع صفحات المقال معاً ليتم معالجتها كمجموعة واحدة. يمكنك ربط المجموعة بفيلم أو شخصية.', en: 'Upload all article pages together to process as a single collection. You can link it to a movie or character.' },
  'upload.singleDesc': { ar: 'ارفع صور منفردة - كل صورة تُعالج على حدة. مناسب للصور المستقلة.', en: 'Upload individual images - each processed separately. Suitable for standalone images.' },
  'upload.howItWorks': { ar: 'كيف تعمل عملية الأرشفة', en: 'How Archiving Works' },
  'upload.step1Title': { ar: '١. الرفع', en: '1. Upload' },
  'upload.step1Desc': { ar: 'ارفع صفحات المقال بالترتيب الصحيح', en: 'Upload article pages in correct order' },
  'upload.step2Title': { ar: '٢. OCR', en: '2. OCR' },
  'upload.step2Desc': { ar: 'استخراج النص العربي بدقة عالية', en: 'Extract Arabic text with high accuracy' },
  'upload.step3Title': { ar: '٣. المراجعة', en: '3. Review' },
  'upload.step3Desc': { ar: 'مراجعة النص وتصحيح الأخطاء', en: 'Review text and correct errors' },
  'upload.step4Title': { ar: '٤. النشر', en: '4. Publish' },
  'upload.step4Desc': { ar: 'نشر المقال في الأرشيف', en: 'Publish article to archive' },
  
  // Collection statuses
  'status.published': { ar: 'منشور', en: 'Published' },
  'status.pending_review': { ar: 'في المراجعة', en: 'In Review' },
  'status.draft': { ar: 'مسودة', en: 'Draft' },
  
  // Common
  'common.loading': { ar: 'جاري التحميل...', en: 'Loading...' },
  'common.error': { ar: 'خطأ', en: 'Error' },
  'common.success': { ar: 'نجاح', en: 'Success' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.delete': { ar: 'حذف', en: 'Delete' },
  'common.edit': { ar: 'تعديل', en: 'Edit' },
  'common.view': { ar: 'عرض', en: 'View' },
  'common.search': { ar: 'بحث', en: 'Search' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('admin-language') as Language;
    if (saved && (saved === 'ar' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('admin-language', lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Language toggle component
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${className}`}
      title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <span className={`transition-opacity ${language === 'ar' ? 'opacity-100' : 'opacity-50'}`}>ع</span>
      <span className="text-slate-400">/</span>
      <span className={`transition-opacity ${language === 'en' ? 'opacity-100' : 'opacity-50'}`}>En</span>
    </button>
  );
}

