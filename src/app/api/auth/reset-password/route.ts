import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const getJwtSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  console.log('NEXTAUTH_SECRET available:', !!secret, 'length:', secret?.length);
  return new TextEncoder().encode(secret || 'fallback-secret-key-for-development');
};

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
export async function POST(request: NextRequest) {
  console.log('=== RESET PASSWORD REQUEST ===');
  
  try {
    const body = await request.json();
    const { token, password } = body;

    console.log('Token received:', token ? `${token.substring(0, 20)}...` : 'NONE');
    console.log('Password received:', password ? `${password.length} chars` : 'NONE');

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify token
    let payload;
    try {
      console.log('Verifying JWT token...');
      const JWT_SECRET = getJwtSecret();
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
      console.log('Token verified successfully');
      console.log('Payload:', JSON.stringify(payload));
    } catch (e: any) {
      console.error('JWT verification failed:', e.code, e.message);
      if (e.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json(
          { success: false, error: 'Reset link has expired. Please request a new one.' },
          { status: 400 }
        );
      }
      if (e.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        return NextResponse.json(
          { success: false, error: 'Invalid reset link. The link may have been corrupted or tampered with.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Invalid reset link: ${e.code || e.message}` },
        { status: 400 }
      );
    }

    // Validate token type
    if (payload.type !== 'password_reset' || !payload.userId) {
      console.log('Invalid token type or missing userId');
      return NextResponse.json(
        { success: false, error: 'Invalid reset token type' },
        { status: 400 }
      );
    }

    console.log('Looking up user:', payload.userId);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found:', user.email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Password hashed, length:', hashedPassword.length);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('Password updated successfully for:', user.email);
    console.log('==============================');

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password', debug: error.message },
      { status: 500 }
    );
  }
}
