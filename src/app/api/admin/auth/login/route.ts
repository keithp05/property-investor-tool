import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Admin session stored in a secure httpOnly cookie
const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/admin/auth/login
 * Authenticate with admin secret
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Admin secret is required' },
        { status: 400 }
      );
    }

    // Verify admin secret from environment variable
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!adminSecret) {
      console.error('ADMIN_SECRET environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Admin authentication is not configured' },
        { status: 500 }
      );
    }

    if (secret !== adminSecret) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin secret' },
        { status: 401 }
      );
    }

    // Check if admin MFA is already set up
    let adminConfig = await prisma.systemSetting.findUnique({
      where: { key: 'admin_mfa_config' },
    });

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION);

    // Store session (we'll use a simple approach with SystemSetting)
    await prisma.systemSetting.upsert({
      where: { key: `admin_session_${sessionToken.substring(0, 16)}` },
      update: {
        value: JSON.stringify({
          token: sessionToken,
          expiresAt: expiresAt.toISOString(),
          mfaVerified: false,
        }),
      },
      create: {
        key: `admin_session_${sessionToken.substring(0, 16)}`,
        value: JSON.stringify({
          token: sessionToken,
          expiresAt: expiresAt.toISOString(),
          mfaVerified: false,
        }),
      },
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_DURATION / 1000,
    });

    // Determine next step
    if (!adminConfig) {
      // MFA not set up yet - require setup
      return NextResponse.json({
        success: true,
        requireMfaSetup: true,
      });
    }

    // MFA is set up - require verification
    return NextResponse.json({
      success: true,
      requireMfaVerify: true,
    });

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}
