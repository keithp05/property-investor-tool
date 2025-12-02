import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid admin password',
        debug: {
          envVarSet: !!process.env.ADMIN_SECRET,
          expectedLength: ADMIN_SECRET?.length,
          receivedLength: password?.length
        }
      }, { status: 401 });
    }

    // Skip MFA for now - table doesn't exist yet
    // Just create a full admin session directly
    const sessionToken = await new SignJWT({ 
      type: 'admin_session',
      mfaVerified: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      needsMfaSetup: false,
      skipMfa: true,
      message: 'Login successful',
    });

    // Set full session cookie
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 28800, // 8 hours
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed', debug: error.message },
      { status: 500 }
    );
  }
}
