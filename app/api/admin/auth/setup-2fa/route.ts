// 2FA Setup endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getSession, generateTOTPSecret, verifyTOTP } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import QRCode from 'qrcode';

// GET - Generate 2FA setup data (secret + QR code)
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.twoFactorVerified) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const admin = await Admin.findById(session.adminId);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    // Check if 2FA is already enabled
    if (admin.twoFactorEnabled) {
      return NextResponse.json({
        enabled: true,
        message: 'التحقق الثنائي مفعل بالفعل',
      });
    }
    
    // Generate new TOTP secret
    const { secret, uri } = generateTOTPSecret(admin.username);
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(uri);
    
    // Store secret temporarily (not enabled yet)
    await Admin.findByIdAndUpdate(session.adminId, {
      twoFactorSecret: secret,
    });
    
    return NextResponse.json({
      enabled: false,
      secret,
      qrCode,
      message: 'امسح رمز QR باستخدام تطبيق المصادقة',
    });
    
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إعداد التحقق الثنائي' },
      { status: 500 }
    );
  }
}

// POST - Verify and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.twoFactorVerified) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
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
    
    const admin = await Admin.findById(session.adminId);
    
    if (!admin || !admin.twoFactorSecret) {
      return NextResponse.json(
        { error: 'يجب إعداد التحقق الثنائي أولاً' },
        { status: 400 }
      );
    }
    
    // Verify the code
    const isValid = verifyTOTP(admin.twoFactorSecret, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 401 }
      );
    }
    
    // Enable 2FA
    await Admin.findByIdAndUpdate(session.adminId, {
      twoFactorEnabled: true,
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم تفعيل التحقق الثنائي بنجاح',
    });
    
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تفعيل التحقق الثنائي' },
      { status: 500 }
    );
  }
}

// DELETE - Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.twoFactorVerified) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }
    
    const { code, password } = await request.json();
    
    if (!code || !password) {
      return NextResponse.json(
        { error: 'رمز التحقق وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const admin = await Admin.findById(session.adminId);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }
    
    // Verify OTP
    if (admin.twoFactorSecret) {
      const isValidOTP = verifyTOTP(admin.twoFactorSecret, code);
      if (!isValidOTP) {
        return NextResponse.json(
          { error: 'رمز التحقق غير صحيح' },
          { status: 401 }
        );
      }
    }
    
    // Disable 2FA
    await Admin.findByIdAndUpdate(session.adminId, {
      twoFactorEnabled: false,
      $unset: { twoFactorSecret: 1 },
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إلغاء تفعيل التحقق الثنائي',
    });
    
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إلغاء التحقق الثنائي' },
      { status: 500 }
    );
  }
}

