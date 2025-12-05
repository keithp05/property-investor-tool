/**
 * Google Calendar OAuth - Initiate Connection
 * GET /api/calendar/google
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGoogleAuthUrl } from '@/services/calendarService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Google Calendar is configured
    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || !process.env.GOOGLE_CALENDAR_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google Calendar integration not configured' },
        { status: 503 }
      );
    }

    // Generate OAuth URL with user ID as state
    const authUrl = getGoogleAuthUrl(session.user.id);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Google Calendar connection' },
      { status: 500 }
    );
  }
}
