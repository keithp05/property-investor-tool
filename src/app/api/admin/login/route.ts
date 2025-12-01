import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret-in-production';
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

/**
 * POST /api/admin/login
 * Verify admin master password
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    // Verify master password
    console.log('Admin login attempt:', { 
      receivedPasswordLength: password?.length,
      expectedPasswordLength: ADMIN_SECRET?.length,
      envVarSet: !!process.env.ADMIN_SECRET,
      match: password === ADMIN_SECRET
    });
    
    if (password !== ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Invalid admin password' }, { status: 401 });
    }

    // Check if MFA is already set up
    const mfaSetting = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_secret' },
    });

    const mfaVerified = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_verified' },
    });

    const needsMfaSetup = !mfaSetting || !mfaVerified || mfaVerified.value !== 'true';

    // Create temporary auth token (valid for 5 minutes, only for MFA setup/verify)
    const tempToken = await new SignJWT({ 
      type: 'admin_temp',
      needsMfaSetup,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      needsMfaSetup,
      message: needsMfaSetup ? 'MFA setup required' : 'Enter MFA code',
    });

    // Set temporary cookie
    response.cookies.set('admin_temp_token', tempToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
