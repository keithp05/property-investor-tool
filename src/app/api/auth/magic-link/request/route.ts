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
  console.log('=== Magic Link Request Started ===');
  
  try {
    // Step 1: Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Step 1 - Body parsed:', { email: body?.email });
    } catch (parseError: any) {
      console.error('Step 1 - Body parse error:', parseError.message);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email } = body;

    if (!email) {
      console.log('Step 1 - No email provided');
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Step 2 - Normalized email:', normalizedEmail);

    // Step 2: Check if user exists
    let user;
    try {
      user = await prisma.user.findUnique({
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
      console.log('Step 2 - User lookup result:', user ? 'Found' : 'Not found');
    } catch (userError: any) {
      console.error('Step 2 - User lookup error:', userError.message);
      throw userError;
    }

    // Always return success to prevent email enumeration
    if (!user) {
      console.log('Step 3 - User not found, returning generic success');
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Check if user is active
    if (!user.isActive || user.isSuspended) {
      console.log('Step 3 - User inactive/suspended');
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a sign-in link shortly.',
      });
    }

    // Step 3: Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    console.log('Step 3 - Token generated, expires:', expires.toISOString());

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Step 4: Database operations
    try {
      // Delete existing unused magic links
      const deleted = await (prisma as any).magicLink.deleteMany({
        where: { 
          email: normalizedEmail,
          used: false,
        },
      });
      console.log('Step 4a - Deleted old links:', deleted.count);

      // Create new magic link
      const created = await (prisma as any).magicLink.create({
        data: {
          email: normalizedEmail,
          token,
          expires,
          mfaPending: user.mfaEnabled || false,
          ipAddress,
          userAgent,
        },
      });
      console.log('Step 4b - Created magic link:', created.id);
    } catch (dbError: any) {
      console.error('Step 4 - Database error:', {
        message: dbError.message,
        code: dbError.code,
      });
      return NextResponse.json(
        { success: false, error: 'Database error. Please try password login.' },
        { status: 503 }
      );
    }

    // Step 5: Send email
    const magicLinkUrl = `${BASE_URL}/auth/magic-link/verify?token=${token}`;
    console.log('Step 5 - Magic link URL generated');

    try {
      const emailResult = await sendMagicLinkEmail(
        normalizedEmail,
        magicLinkUrl,
        user.name || undefined
      );
      console.log('Step 5 - Email result:', emailResult);
      
      if (!emailResult.success) {
        console.error('Step 5 - Email send failed:', emailResult.error);
      }
    } catch (emailError: any) {
      console.error('Step 5 - Email error:', emailError.message);
      // Don't fail the request, email might still work
    }

    console.log('=== Magic Link Request Completed Successfully ===');
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a sign-in link shortly.',
    });

  } catch (error: any) {
    console.error('=== Magic Link Request Failed ===');
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try password login.' },
      { status: 500 }
    );
  }
}
