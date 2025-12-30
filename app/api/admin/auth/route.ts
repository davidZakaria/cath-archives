// Admin Authentication API - Login endpoint
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { createToken, setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// POST - Login with username/email and password
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }
    
    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() },
      ],
    });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }
    
    // Check if account is locked
    if (admin.isLocked()) {
      const lockMinutes = Math.ceil((admin.lockUntil!.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `الحساب مغلق. حاول مرة أخرى بعد ${lockMinutes} دقيقة` },
        { status: 423 }
      );
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    
    if (!isValidPassword) {
      await admin.incrementLoginAttempts();
      const remaining = 5 - (admin.loginAttempts + 1);
      return NextResponse.json(
        { 
          error: 'بيانات الدخول غير صحيحة',
          remaining: remaining > 0 ? remaining : 0,
        },
        { status: 401 }
      );
    }
    
    // Password is correct, check if 2FA is enabled
    const requires2FA = admin.twoFactorEnabled;
    
    // Create session token
    const token = await createToken({
      adminId: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      twoFactorVerified: !requires2FA, // If 2FA not enabled, mark as verified
    });
    
    // Set session cookie
    await setSessionCookie(token);
    
    // Reset login attempts on successful password verification
    await admin.resetLoginAttempts();
    
    return NextResponse.json({
      success: true,
      requires2FA,
      message: requires2FA ? 'يرجى إدخال رمز التحقق' : 'تم تسجيل الدخول بنجاح',
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}

// GET - Check current session status
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }
    
    return NextResponse.json({
      authenticated: true,
      fullyAuthenticated: session.twoFactorVerified,
      username: session.username,
      email: session.email,
    });
    
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

// DELETE - Logout
export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: 'تم تسجيل الخروج' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الخروج' },
      { status: 500 }
    );
  }
}

// PUT - Create initial admin (only if no admins exist)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'يوجد مدير بالفعل. استخدم صفحة الإعدادات لإضافة مديرين جدد.' },
        { status: 400 }
      );
    }
    
    const { username, email, password } = await request.json();
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create admin
    const admin = await Admin.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      twoFactorEnabled: false,
    });
    
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء حساب المدير بنجاح',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
    
  } catch (error) {
    console.error('Create admin error:', error);
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الحساب' },
      { status: 500 }
    );
  }
}

