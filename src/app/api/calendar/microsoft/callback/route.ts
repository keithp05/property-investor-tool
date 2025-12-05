/**
 * Microsoft Calendar OAuth Callback
 * GET /api/calendar/microsoft/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeMicrosoftCode } from '@/services/calendarService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeMicrosoftCode(code);

    // Store tokens in database
    await prisma.user.update({
      where: { id: state },
      data: {
        microsoftCalendarAccessToken: tokens.accessToken,
        microsoftCalendarRefreshToken: tokens.refreshToken,
        microsoftCalendarEmail: tokens.email,
        microsoftCalendarConnectedAt: new Date(),
      },
    });

    console.log(`✅ Microsoft Calendar connected for user ${state}: ${tokens.email}`);

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar=success&provider=microsoft`
    );
  } catch (error: any) {
    console.error('Microsoft Calendar callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?calendar=error&message=${encodeURIComponent(error.message || 'Failed to connect Microsoft Calendar')}`
    );
  }
}
