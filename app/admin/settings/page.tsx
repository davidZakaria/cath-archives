'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AdminUser {
  username: string;
  email: string;
  twoFactorEnabled: boolean;
  lastLogin?: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 2FA Setup state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  
  // Disable 2FA state
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        // Get more details about the user including 2FA status
        const setup2FARes = await fetch('/api/admin/auth/setup-2fa');
        const setup2FAData = await setup2FARes.json();
        
        setUser({
          username: data.username,
          email: data.email,
          twoFactorEnabled: setup2FAData.enabled || false,
          lastLogin: data.lastLogin,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const start2FASetup = async () => {
    setSetupLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/auth/setup-2fa');
      const data = await res.json();
      
      if (data.enabled) {
        setMessage({ type: 'error', text: 'التحقق الثنائي مفعل بالفعل' });
        return;
      }
      
      setSetupData({
        qrCode: data.qrCode,
        secret: data.secret,
      });
      setShow2FASetup(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل في إعداد التحقق الثنائي' });
    } finally {
      setSetupLoading(false);
    }
  };

  const verify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/auth/setup-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'رمز التحقق غير صحيح' });
        return;
      }
      
      setMessage({ type: 'success', text: 'تم تفعيل التحقق الثنائي بنجاح!' });
      setShow2FASetup(false);
      setSetupData(null);
      setVerifyCode('');
      fetchUser();
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setSetupLoading(false);
    }
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/auth/setup-2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode, password: disablePassword }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل في إلغاء التحقق الثنائي' });
        return;
      }
      
      setMessage({ type: 'success', text: 'تم إلغاء التحقق الثنائي' });
      setShowDisable2FA(false);
      setDisablePassword('');
      setDisableCode('');
      fetchUser();
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ' });
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الإعدادات</h1>
        <p className="text-slate-500 mt-1">إدارة حساب المدير والأمان</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-left text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">معلومات الحساب</h2>
        
        {user && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{user.username}</p>
                <p className="text-slate-500" dir="ltr">{user.email}</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">اسم المستخدم</p>
                <p className="font-medium text-slate-900">{user.username}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">البريد الإلكتروني</p>
                <p className="font-medium text-slate-900" dir="ltr">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">التحقق الثنائي (2FA)</h2>
            <p className="text-sm text-slate-500 mt-1">أضف طبقة حماية إضافية لحسابك</p>
          </div>
          {user?.twoFactorEnabled ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              ✓ مفعل
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              غير مفعل
            </span>
          )}
        </div>

        {user?.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✓ التحقق الثنائي مفعل. يتطلب رمز من تطبيق المصادقة عند كل تسجيل دخول.
              </p>
            </div>
            
            {!showDisable2FA ? (
              <button
                onClick={() => setShowDisable2FA(true)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                إلغاء التحقق الثنائي
              </button>
            ) : (
              <form onSubmit={disable2FA} className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                <p className="text-red-800 font-medium">تأكيد إلغاء التحقق الثنائي</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">رمز التحقق</label>
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center text-lg tracking-widest"
                    placeholder="000000"
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={setupLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {setupLoading ? 'جاري...' : 'إلغاء التحقق الثنائي'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisable2FA(false);
                      setDisablePassword('');
                      setDisableCode('');
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">
                ⚠️ التحقق الثنائي غير مفعل. ننصح بتفعيله لحماية حسابك.
              </p>
            </div>

            {!show2FASetup ? (
              <button
                onClick={start2FASetup}
                disabled={setupLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {setupLoading ? 'جاري...' : 'تفعيل التحقق الثنائي'}
              </button>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-6">
                <div className="text-center">
                  <h3 className="font-bold text-slate-900 mb-2">إعداد التحقق الثنائي</h3>
                  <p className="text-sm text-slate-500">امسح رمز QR باستخدام تطبيق المصادقة</p>
                </div>

                {setupData && (
                  <>
                    {/* QR Code */}
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-xl shadow-sm">
                        <Image
                          src={setupData.qrCode}
                          alt="2FA QR Code"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Manual Secret */}
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-2">أو أدخل الرمز يدوياً:</p>
                      <code className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-mono text-slate-900 select-all">
                        {setupData.secret}
                      </code>
                    </div>

                    {/* Verify Form */}
                    <form onSubmit={verify2FA} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
                          أدخل الرمز من التطبيق للتأكيد
                        </label>
                        <input
                          type="text"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          maxLength={6}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                          placeholder="000000"
                          dir="ltr"
                        />
                      </div>
                      <div className="flex gap-3 justify-center">
                        <button
                          type="submit"
                          disabled={setupLoading || verifyCode.length !== 6}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {setupLoading ? 'جاري التحقق...' : 'تأكيد وتفعيل'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShow2FASetup(false);
                            setSetupData(null);
                            setVerifyCode('');
                          }}
                          className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supported Apps */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">تطبيقات المصادقة المدعومة</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: 'Google Authenticator', icon: '🔐' },
            { name: 'Microsoft Authenticator', icon: '🛡️' },
            { name: 'Authy', icon: '📱' },
          ].map((app) => (
            <div key={app.name} className="p-4 bg-slate-50 rounded-lg text-center">
              <span className="text-3xl mb-2 block">{app.icon}</span>
              <p className="text-sm font-medium text-slate-700">{app.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          نصائح أمنية
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• استخدم كلمة مرور قوية وفريدة لهذا الحساب</li>
          <li>• فعّل التحقق الثنائي لحماية إضافية</li>
          <li>• لا تشارك رموز التحقق مع أي شخص</li>
          <li>• احتفظ بنسخة احتياطية من مفتاح 2FA السري في مكان آمن</li>
          <li>• قم بتسجيل الخروج عند الانتهاء من استخدام لوحة التحكم</li>
        </ul>
      </div>
    </div>
  );
}

