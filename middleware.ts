// Middleware to protect admin routes
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cinema-zaman-admin-secret-key-change-in-production'
);

// Routes that don't require authentication
const publicRoutes = [
  '/admin/login',
];

// Routes that require full authentication (password + 2FA)
const protectedRoutes = [
  '/admin',
  '/admin/collections',
  '/admin/review',
  '/admin/categories',
  '/admin/ocr-queue',
  '/admin/settings',
  '/admin/movies',
  '/admin/characters',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only handle admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  
  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next();
  }
  
  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // Get session token
  const token = request.cookies.get('admin-session')?.value;
  
  if (!token) {
    // Redirect to login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  try {
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if 2FA is verified
    if (!payload.twoFactorVerified) {
      // User needs to complete 2FA
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Token is valid and 2FA is verified
    return NextResponse.next();
    
  } catch {
    // Invalid token - redirect to login
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    // Clear invalid cookie
    response.cookies.delete('admin-session');
    return response;
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};

