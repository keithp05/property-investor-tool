/**
 * Google Calendar OAuth Callback
 * GET /api/calendar/google/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeGoogleCode } from '@/services/calendarService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);

    // Store tokens in database
    await prisma.user.update({
      where: { id: state },
      data: {
        googleCalendarAccessToken: tokens.accessToken,
        googleCalendarRefreshToken: tokens.refreshToken,
        googleCalendarEmail: tokens.email,
        googleCalendarConnectedAt: new Date(),
      },
    });

    console.log(`✅ Google Calendar connected for user ${state}: ${tokens.email}`);

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar=success&provider=google`
    );
  } catch (error: any) {
    console.error('Google Calendar callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent(error.message || 'Failed to connect Google Calendar')}`
    );
  }
}
