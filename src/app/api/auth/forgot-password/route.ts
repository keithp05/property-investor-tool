import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  console.log('NEXTAUTH_SECRET available:', !!secret, 'length:', secret?.length);
  return new TextEncoder().encode(secret || 'fallback-secret-key-for-development');
};

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  console.log('=== FORGOT PASSWORD REQUEST ===');
  
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Looking up user:', normalizedEmail);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    // If user not found, still return success (prevent email enumeration)
    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    console.log('User found:', user.id);

    // Generate JWT reset token (valid for 1 hour)
    const JWT_SECRET = getJwtSecret();
    const resetToken = await new SignJWT({ 
      type: 'password_reset',
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    console.log('Token generated, length:', resetToken.length);

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    console.log('Reset URL generated for:', user.email);
    console.log('==============================');
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      resetUrl: resetUrl,
      note: 'Email sending not configured. Use the link below to reset your password.',
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to process request', debug: error.message },
      { status: 500 }
    );
  }
}
