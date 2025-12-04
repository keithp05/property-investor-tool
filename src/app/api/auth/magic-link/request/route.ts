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
      // First, check if the MagicLink table exists by trying a simple query
      // Delete any existing unused magic links for this email
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
      
      console.log('Magic link created for:', normalizedEmail);
    } catch (dbError: any) {
      // Log the full error for debugging
      console.error('MagicLink database error:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
      });
      
      // Check if it's a "table doesn't exist" error
      if (dbError.code === 'P2021' || 
          dbError.message?.includes('does not exist') ||
          dbError.message?.includes('relation') ||
          dbError.message?.includes('MagicLink')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Magic link feature is being set up. Please use password login for now.',
            debug: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          },
          { status: 503 }
        );
      }
      
      // Re-throw other errors
      throw dbError;
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
      // Still return success to not leak info, but log the error
    }

    console.log('Magic link sent to:', normalizedEmail, 'MFA required:', user.mfaEnabled);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a sign-in link shortly.',
    });

  } catch (error: any) {
    console.error('Magic link request error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request. Please try password login.',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
