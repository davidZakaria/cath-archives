// Authentication utilities for Admin dashboard
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import * as OTPAuth from 'otpauth';

// Environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cinema-zaman-admin-secret-key-change-in-production'
);
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Session payload type
export interface SessionPayload {
  adminId: string;
  username: string;
  email: string;
  twoFactorVerified: boolean;
  exp?: number;
}

// Create JWT token
export async function createToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Get session from cookies
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-session')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

// Get session from request (for API routes)
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('admin-session')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('admin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin-session');
}

// Generate TOTP secret for 2FA setup
export function generateTOTPSecret(username: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: 'Cinema Zaman Admin',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(generateRandomHex(20)),
  });
  
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

// Verify TOTP code
export function verifyTOTP(secret: string, code: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Cinema Zaman Admin',
      label: 'admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    
    // Allow 1 period window for clock drift
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// Helper to generate random hex string
function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Check if admin is fully authenticated (password + 2FA)
export async function isFullyAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.twoFactorVerified === true;
}

// Check if admin needs 2FA verification
export async function needs2FAVerification(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.twoFactorVerified === false;
}

