import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    // Generate JWT reset token (valid for 1 hour)
    const resetToken = await new SignJWT({ 
      type: 'password_reset',
      userId: user.id,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // TODO: Send email with resetUrl
    // For now, log it (in production, use a proper email service like SendGrid, Resend, etc.)
    console.log('=== PASSWORD RESET REQUEST ===');
    console.log('User:', user.email);
    console.log('Reset URL:', resetUrl);
    console.log('==============================');

    // In development or for testing, we can return the URL
    // In production, remove the resetUrl from response
    const isDev = process.env.NODE_ENV !== 'production';
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      ...(isDev && { resetUrl, note: 'Development mode: URL shown for testing' }),
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
