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
    // Step 1: Parse request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 2: Check if user exists (only query columns that definitely exist)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        isActive: true,
        isSuspended: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Check if user is active
    if (!user.isActive || user.isSuspended) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Step 3: Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Step 4: Database operations
    // Delete existing unused magic links
    await (prisma as any).magicLink.deleteMany({
      where: { 
        email: normalizedEmail,
        used: false,
      },
    });

    // Create new magic link (mfaPending defaults to false for now)
    await (prisma as any).magicLink.create({
      data: {
        email: normalizedEmail,
        token,
        expires,
        mfaPending: false, // MFA check will happen at verification time
        ipAddress,
        userAgent,
      },
    });

    // Step 5: Send email
    const magicLinkUrl = `${BASE_URL}/auth/magic-link/verify?token=${token}`;

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
