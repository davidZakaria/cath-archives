import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0c08] relative overflow-hidden flex items-center justify-center" dir="rtl">
      {/* Background Effects */}
      <div className="fixed inset-0 egyptian-pattern opacity-20 pointer-events-none" />
      
      {/* Film grain */}
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Spotlight */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[150%] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(201, 162, 39, 0.1) 0%, transparent 60%)' }}
      />
      
      {/* Film sprockets */}
      <div className="fixed top-0 left-0 w-6 h-full flex flex-col justify-around py-8 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-[#1a1612] rounded-sm mx-auto border border-[#3a3020]" />
        ))}
      </div>
      <div className="fixed top-0 right-0 w-6 h-full flex flex-col justify-around py-8 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-[#1a1612] rounded-sm mx-auto border border-[#3a3020]" />
        ))}
      </div>

      {/* Curtains */}
      <div className="fixed top-0 left-0 w-32 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(107, 28, 35, 0.5) 0%, transparent 100%)' }}
      />
      <div className="fixed top-0 right-0 w-32 h-full pointer-events-none"
        style={{ background: 'linear-gradient(270deg, rgba(107, 28, 35, 0.5) 0%, transparent 100%)' }}
      />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        {/* Broken film reel */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="text-[150px] leading-none opacity-20 select-none">🎞️</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl">❌</span>
            </div>
          </div>
        </div>

        {/* 404 */}
        <div className="mb-6">
          <h1 className="text-[180px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#c9a227] to-[#5c4108] leading-none"
            style={{ fontFamily: 'Georgia, serif', textShadow: '0 4px 20px rgba(201, 162, 39, 0.3)' }}
          >
            404
          </h1>
        </div>

        {/* Title */}
        <h2 className="text-4xl font-bold text-[#c9a227] mb-4" style={{ fontFamily: "'Amiri', serif" }}>
          الفيلم غير موجود!
        </h2>
        <p className="text-[#8b7319] text-lg mb-2 tracking-widest">FILM NOT FOUND</p>
        
        <div className="flex justify-center gap-2 my-6">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-[#c9a227]">★</span>
          ))}
        </div>

        <p className="text-[#9c8550] text-xl mb-8 leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
          يبدو أن هذا الفيلم لم يُعرض بعد في صالاتنا...
          <br />
          <span className="text-[#7a6540]">ربما تم قطعه من المخرج!</span>
        </p>

        {/* Famous quote */}
        <div className="vintage-card p-6 rounded-xl mb-8 inline-block">
          <p className="text-[#e8d48b] text-lg italic" style={{ fontFamily: "'Amiri', serif" }}>
            &ldquo;الطريق مسدود... لكن دايماً في طريق تاني&rdquo;
          </p>
          <p className="text-[#8b7319] text-sm mt-2">— من أفلام العصر الذهبي</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="btn-rotana px-8 py-4 rounded-xl text-lg font-bold inline-flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            العودة للرئيسية
          </Link>
          <Link 
            href="/archive"
            className="btn-outline-gold px-8 py-4 rounded-xl text-lg font-bold inline-flex items-center justify-center gap-2"
          >
            <span>📚</span>
            تصفح الأرشيف
          </Link>
        </div>

        {/* Decorative hieroglyphs */}
        <div className="mt-12 text-[#c9a22730] text-sm tracking-[0.5em]">
          𓂀 𓃭 𓆣 𓇋 𓈖 𓊪 𓋴 𓌳
        </div>
      </div>
    </div>
  );
}

