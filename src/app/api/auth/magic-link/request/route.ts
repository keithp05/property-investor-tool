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
    const body = await request.json();
    const { email, rememberMe = false } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists - try to get MFA status if columns exist
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { 
          id: true, 
          email: true, 
          name: true,
          isActive: true,
          isSuspended: true,
          mfaEnabled: true,
        },
      });
    } catch (e) {
      // Columns might not exist yet, fall back to basic query
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { 
          id: true, 
          email: true, 
          name: true,
        },
      });
    }

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Check if user is active (if columns exist)
    if (user.isActive === false || user.isSuspended === true) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Delete existing unused magic links
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
        mfaPending: user.mfaEnabled || false,
        ipAddress,
        userAgent,
      },
    });

    // Send email - include rememberMe as query parameter
    const magicLinkUrl = `${BASE_URL}/auth/magic-link/verify?token=${token}${rememberMe ? '&remember=1' : ''}`;

    const emailResult = await sendMagicLinkEmail(
      normalizedEmail,
      magicLinkUrl,
      user.name || undefined
    );
    
    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a sign-in link shortly.',
    });

  } catch (error: any) {
    console.error('Magic link request error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Magic link request failed',
        debug: {
          message: error.message,
          name: error.name,
          code: error.code,
        }
      },
      { status: 500 }
    );
  }
}
