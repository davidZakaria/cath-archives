// OTP Verification endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyTOTP, createToken, setSessionCookie } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';

// POST - Verify OTP code
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }
    
    if (session.twoFactorVerified) {
      return NextResponse.json(
        { error: 'تم التحقق بالفعل' },
        { status: 400 }
      );
    }
    
    const { code } = await request.json();
    
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صالح' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Get admin's 2FA secret
    const admin = await Admin.findById(session.adminId);
    
    if (!admin || !admin.twoFactorSecret) {
      return NextResponse.json(
        { error: 'خطأ في إعدادات التحقق الثنائي' },
        { status: 400 }
      );
    }
    
    // Verify OTP
    const isValid = verifyTOTP(admin.twoFactorSecret, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 401 }
      );
    }
    
    // Create new token with 2FA verified
    const newToken = await createToken({
      adminId: session.adminId,
      username: session.username,
      email: session.email,
      twoFactorVerified: true,
    });
    
    // Update session cookie
    await setSessionCookie(newToken);
    
    return NextResponse.json({
      success: true,
      message: 'تم التحقق بنجاح',
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق' },
      { status: 500 }
    );
  }
}

