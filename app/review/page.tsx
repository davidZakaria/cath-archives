import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import Document from '@/models/Document';

async function getDocuments(status?: string) {
  try {
    await connectDB();
    
    const query: Record<string, string> = {};
    if (status && status !== 'all') {
      query.reviewStatus = status;
    }
    
    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .lean();
    
    return JSON.parse(JSON.stringify(
      documents.map((doc) => ({
        _id: doc._id.toString(),
        filename: doc.filename,
        imagePath: doc.imagePath,
        ocrConfidence: doc.ocrConfidence || 0,
        ocrText: doc.ocrText || '',
        reviewStatus: doc.reviewStatus,
        reviewTimeSeconds: doc.reviewTimeSeconds || 0,
        pendingCorrections: doc.pendingCorrections || [],
        approvedCorrectionsCount: doc.approvedCorrectionsCount || 0,
        uploadedAt: doc.uploadedAt,
        processingStatus: doc.processingStatus || 'pending',
      }))
    ));
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = statusParam || 'all';
  const documents = await getDocuments(status !== 'all' ? status : undefined);

  const stats = {
    total: documents.length,
    pending: documents.filter((d: { reviewStatus: string }) => d.reviewStatus === 'pending').length,
    inProgress: documents.filter((d: { reviewStatus: string }) => d.reviewStatus === 'in_progress').length,
    completed: documents.filter((d: { reviewStatus: string }) => d.reviewStatus === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden film-grain" dir="rtl">
      {/* Egyptian Pattern Background */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      
      {/* Spotlight */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.1) 0%, transparent 60%)',
        }}
      />
      
      {/* Film Sprockets */}
      <div className="fixed top-0 left-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />
      <div className="fixed top-0 right-0 w-5 h-full bg-[#1a1612] film-sprockets pointer-events-none" />

      {/* Cinema Curtains */}
      <div className="fixed top-0 left-0 w-28 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(107, 28, 35, 0.4) 0%, transparent 100%)' }}
      />
      <div className="fixed top-0 right-0 w-28 h-full pointer-events-none"
        style={{ background: 'linear-gradient(270deg, rgba(107, 28, 35, 0.4) 0%, transparent 100%)' }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="rotana-header py-4 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a227] via-[#e8d48b] to-[#8b7319] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#1a1612] flex items-center justify-center">
                    <span className="text-2xl">🎬</span>
                  </div>
                </div>
                <div>
                  <span className="text-[#c9a227] font-bold text-lg arabic-title">سينما زمان</span>
                  <p className="text-[#8b7319] text-xs">CINEMA ZAMAN</p>
                </div>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                الرئيسية
              </Link>
              <Link href="/archive" className="btn-outline-gold px-4 py-2 rounded-lg text-sm font-medium">
                الأرشيف
              </Link>
              <Link href="/movies" className="btn-rotana px-4 py-2 rounded-lg text-sm font-bold">
                الأفلام
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <div className="container mx-auto px-6 py-10">
          {/* Page Title */}
          <div className="text-center mb-10">
            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="text-[#c9a227] text-2xl">𓃭</span>
              <h1 className="text-4xl font-bold film-title arabic-title">قائمة المراجعة</h1>
              <span className="text-[#c9a227] text-2xl">𓃭</span>
            </div>
            <p className="text-[#8b7319] tracking-wider">REVIEW QUEUE</p>
            <div className="art-deco-divider max-w-sm mx-auto mt-4">
              <span className="text-[#c9a227]">❖</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
            <div className="vintage-card p-5 rounded-xl text-center">
              <div className="text-4xl font-bold text-[#c9a227] mb-1">{stats.total}</div>
              <div className="text-xs text-[#9c8550]">إجمالي الوثائق</div>
            </div>
            <div className="vintage-card p-5 rounded-xl text-center">
              <div className="text-4xl font-bold text-[#e8d48b] mb-1">{stats.pending}</div>
              <div className="text-xs text-[#9c8550]">في الانتظار</div>
            </div>
            <div className="vintage-card p-5 rounded-xl text-center">
              <div className="text-4xl font-bold text-[#c9a227] mb-1">{stats.inProgress}</div>
              <div className="text-xs text-[#9c8550]">قيد المراجعة</div>
            </div>
            <div className="vintage-card p-5 rounded-xl text-center">
              <div className="text-4xl font-bold text-[#90ee90] mb-1">{stats.completed}</div>
              <div className="text-xs text-[#9c8550]">مكتملة</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center mb-10">
            <div className="vintage-card inline-flex p-1.5 rounded-xl gap-1">
              {[
                { value: 'all', label: 'الكل', icon: '📋' },
                { value: 'pending', label: 'في الانتظار', icon: '⏳' },
                { value: 'in_progress', label: 'قيد المراجعة', icon: '✏️' },
                { value: 'completed', label: 'مكتملة', icon: '✅' },
              ].map((filter) => (
                <Link
                  key={filter.value}
                  href={`/review?status=${filter.value}`}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all text-sm flex items-center gap-2 ${
                    status === filter.value
                      ? 'bg-gradient-to-b from-[#c9a227] to-[#8b7319] text-[#1a1612]'
                      : 'text-[#9c8550] hover:text-[#c9a227]'
                  }`}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="vintage-card rounded-2xl p-16 text-center max-w-2xl mx-auto">
              <div className="text-7xl mb-6">🎞️</div>
              <h3 className="text-2xl font-bold text-[#c9a227] mb-2 arabic-title">لا توجد وثائق</h3>
              <p className="text-[#9c8550] mb-8">ابدأ برفع وثائقك الأولى من العصر الذهبي</p>
              <Link href="/" className="btn-rotana px-8 py-3 rounded-xl inline-flex items-center gap-2">
                <span>📤</span>
                رفع وثائق جديدة
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 max-w-4xl mx-auto">
              {documents.map((doc: { 
                _id: string; 
                filename: string; 
                imagePath: string; 
                ocrConfidence: number;
                ocrText: string;
                reviewStatus: string;
                reviewTimeSeconds: number;
                pendingCorrections: Array<{ status: string }>;
                approvedCorrectionsCount: number;
                uploadedAt: string;
                processingStatus: string;
              }) => {
                const pendingAICount = doc.pendingCorrections?.filter(c => c.status === 'pending').length || 0;
                const hasOCRText = doc.ocrText && doc.ocrText.length > 0;
                
                return (
                  <Link
                    key={doc._id}
                    href={`/review/${doc._id}`}
                    className="vintage-card rounded-xl p-5 transition-all hover:scale-[1.01] group"
                  >
                    <div className="flex items-start gap-5">
                      {/* Thumbnail with film frame */}
                      <div className="relative flex-shrink-0">
                        <div className="w-28 h-28 rounded-lg overflow-hidden border-2 border-[#5c4108] group-hover:border-[#c9a227] transition-colors sepia-photo">
                          <img
                            src={doc.imagePath}
                            alt={doc.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Film sprocket decoration */}
                        <div className="absolute -left-1.5 top-0 bottom-0 w-3 flex flex-col justify-around">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-2.5 h-2.5 bg-[#3a3020] rounded-sm border border-[#5c4108]" />
                          ))}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-[#c9a227] mb-2 truncate group-hover:text-[#e8d48b] transition-colors arabic-title">
                          {doc.filename}
                        </h3>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-[#9c8550] mb-3">
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            {new Date(doc.uploadedAt).toLocaleDateString('ar-EG')}
                          </span>
                          
                          {doc.ocrConfidence > 0 && (
                            <span className="flex items-center gap-1">
                              <span>🎯</span>
                              <span className={
                                doc.ocrConfidence > 0.8
                                  ? 'text-[#90ee90]'
                                  : doc.ocrConfidence > 0.6
                                  ? 'text-[#e8d48b]'
                                  : 'text-[#ff6b6b]'
                              }>
                                {Math.round(doc.ocrConfidence * 100)}%
                              </span>
                            </span>
                          )}
                          
                          {doc.reviewTimeSeconds > 0 && (
                            <span className="flex items-center gap-1">
                              <span>⏱️</span>
                              {Math.floor(doc.reviewTimeSeconds / 60)}د {doc.reviewTimeSeconds % 60}ث
                            </span>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            doc.reviewStatus === 'completed'
                              ? 'badge-complete'
                              : doc.reviewStatus === 'in_progress'
                              ? 'badge-progress'
                              : 'badge-pending'
                          }`}>
                            {doc.reviewStatus === 'completed' ? '✓ مكتملة' 
                              : doc.reviewStatus === 'in_progress' ? '✏️ قيد المراجعة' 
                              : '⏳ في الانتظار'}
                          </span>

                          {hasOCRText ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#2a4a2a]/50 text-[#90ee90] border border-[#4a8a4a]/50">
                              ✓ OCR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#4a3f20]/50 text-[#e8d48b] border border-[#8a7a4a]/50">
                              ⏳ OCR
                            </span>
                          )}

                          {pendingAICount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#4a2a4a]/50 text-[#da70d6] border border-[#8a4a8a]/50">
                              🤖 {pendingAICount} تصحيح
                            </span>
                          )}
                          
                          {doc.approvedCorrectionsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[#2a4a2a]/50 text-[#90ee90] border border-[#4a8a4a]/50">
                              ✓ {doc.approvedCorrectionsCount} موافق
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-shrink-0 text-[#5c4108] group-hover:text-[#c9a227] transition-colors self-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Upload CTA */}
          <div className="text-center mt-12">
            <Link href="/" className="btn-rotana px-8 py-3 rounded-xl inline-flex items-center gap-2">
              <span>📤</span>
              رفع وثائق جديدة
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-[#3a3020] mt-12">
          <div className="container mx-auto text-center">
            <div className="text-[#c9a22730] text-xs tracking-[0.3em] mb-4">
              𓂀 𓃭 𓆣 𓇋 𓈖 𓊪
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-[#8b7319]">★</span>
              ))}
            </div>
            <p className="text-[#5c4108] text-sm">
              سينما زمان © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
