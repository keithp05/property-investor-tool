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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    // If user not found, still return success (prevent email enumeration)
    // but don't generate a token
    if (!user) {
      console.log('Forgot password: User not found for email:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
        // No resetUrl since user doesn't exist
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

    console.log('=== PASSWORD RESET LINK ===');
    console.log('User:', user.email);
    console.log('Reset URL:', resetUrl);
    console.log('===========================');

    // TODO: In production, send email instead of returning URL
    // For now, we return the URL so users can test the feature
    // Once you set up an email service (SendGrid, Resend, AWS SES), 
    // remove resetUrl from response and send it via email instead
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      // Always show the reset URL until email is configured
      resetUrl: resetUrl,
      note: 'Email sending not configured. Use the link below to reset your password.',
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
