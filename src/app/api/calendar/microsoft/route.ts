/**
 * Microsoft Calendar OAuth - Initiate Connection
 * GET /api/calendar/microsoft
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMicrosoftAuthUrl } from '@/services/calendarService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Microsoft Calendar is configured
    if (!process.env.MICROSOFT_CALENDAR_CLIENT_ID || !process.env.MICROSOFT_CALENDAR_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Microsoft Calendar integration not configured' },
        { status: 503 }
      );
    }

    // Generate OAuth URL with user ID as state
    const authUrl = getMicrosoftAuthUrl(session.user.id);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Microsoft Calendar auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Microsoft Calendar connection' },
      { status: 500 }
    );
  }
}
