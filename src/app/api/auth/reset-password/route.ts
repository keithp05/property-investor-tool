import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const getJwtSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
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
    } catch (e: any) {
      console.error('JWT verification failed:', e.code, e.message);
      if (e.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json(
          { success: false, error: 'Reset link has expired. Please request a new one.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Validate token type
    if (payload.type !== 'password_reset' || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Resetting password for:', user.email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('Password reset successful for:', user.email);
    console.log('==============================');

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
