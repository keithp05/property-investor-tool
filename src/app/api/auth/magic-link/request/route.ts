import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMagicLinkEmail } from '@/lib/email';
import crypto from 'crypto';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://develop.d3q1fuby25122q.amplifyapp.com';

/**
 * POST /api/auth/magic-link/request
 * Request a magic link for passwordless login
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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        mfaEnabled: true,
        isActive: true,
        isSuspended: true,
      },
    });

    // Always return success to prevent email enumeration
    // But only actually send the email if the user exists
    if (!user) {
      console.log('Magic link requested for non-existent email:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Check if user is active
    if (!user.isActive || user.isSuspended) {
      console.log('Magic link requested for inactive/suspended user:', normalizedEmail);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration (15 minutes)
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Get IP and user agent for security
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Delete any existing unused magic links for this email
      // Use prisma as any to avoid type issues during build
      await (prisma as any).magicLink.deleteMany({
        where: { 
          email: normalizedEmail,
          used: false,
        },
      });

      // Create new magic link
      await (prisma as any).magicLink.create({
        data: {
          email: normalizedEmail,
          token,
          expires,
          mfaPending: user.mfaEnabled,
          ipAddress,
          userAgent,
        },
      });
    } catch (dbError: any) {
      // Handle case where MagicLink table doesn't exist yet
      console.error('MagicLink database error:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Magic link feature is not yet available. Please use password login.' },
        { status: 503 }
      );
    }

    // Generate the magic link URL
    const magicLinkUrl = `${BASE_URL}/auth/magic-link/verify?token=${token}`;

    // Send the email
    const emailResult = await sendMagicLinkEmail(
      normalizedEmail,
      magicLinkUrl,
      user.name || undefined
    );

    if (!emailResult.success) {
      console.error('Failed to send magic link email:', emailResult.error);
    }

    console.log('Magic link sent to:', normalizedEmail, 'MFA required:', user.mfaEnabled);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a sign-in link shortly.',
    });

  } catch (error: any) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
