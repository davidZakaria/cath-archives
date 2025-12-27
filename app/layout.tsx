import type { Metadata, Viewport } from "next";
import { Amiri, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "سينما زمان | أرشيف السينما المصرية",
  description: "أرشيف رقمي للسينما المصرية - حفظ التراث السينمائي من المجلات والصحف التاريخية باستخدام الذكاء الاصطناعي",
  keywords: ["السينما المصرية", "أرشيف", "التراث", "الأفلام المصرية", "العصر الذهبي", "روتانا سينما زمان", "فاتن حمامة", "عمر الشريف"],
  authors: [{ name: "Cinema Zaman Archive" }],
  creator: "Cinema Zaman",
  publisher: "Cinema Zaman",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "سينما زمان",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "سينما زمان",
    title: "سينما زمان | أرشيف السينما المصرية",
    description: "حفظ التراث السينمائي المصري للأجيال القادمة",
  },
  twitter: {
    card: "summary_large_image",
    title: "سينما زمان | أرشيف السينما المصرية",
    description: "حفظ التراث السينمائي المصري للأجيال القادمة",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#c9a227",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${amiri.variable} ${notoNaskhArabic.variable} antialiased`}
        style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', Georgia, serif" }}
      >
        {children}
      </body>
    </html>
  );
}
