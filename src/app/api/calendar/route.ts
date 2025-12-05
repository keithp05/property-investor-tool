/**
 * Calendar Integration API
 * GET /api/calendar - Get calendar connection status
 * DELETE /api/calendar - Disconnect a calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get calendar connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarEmail: true,
        googleCalendarConnectedAt: true,
        microsoftCalendarEmail: true,
        microsoftCalendarConnectedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      google: user.googleCalendarEmail ? {
        connected: true,
        email: user.googleCalendarEmail,
        connectedAt: user.googleCalendarConnectedAt,
      } : { connected: false },
      microsoft: user.microsoftCalendarEmail ? {
        connected: true,
        email: user.microsoftCalendarEmail,
        connectedAt: user.microsoftCalendarConnectedAt,
      } : { connected: false },
    });
  } catch (error: any) {
    console.error('Calendar status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get calendar status' },
      { status: 500 }
    );
  }
}

// Disconnect a calendar
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await request.json();

    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "microsoft"' },
        { status: 400 }
      );
    }

    if (provider === 'google') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          googleCalendarAccessToken: null,
          googleCalendarRefreshToken: null,
          googleCalendarEmail: null,
          googleCalendarConnectedAt: null,
        },
      });
      console.log(`🔌 Google Calendar disconnected for user ${session.user.id}`);
    } else {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          microsoftCalendarAccessToken: null,
          microsoftCalendarRefreshToken: null,
          microsoftCalendarEmail: null,
          microsoftCalendarConnectedAt: null,
        },
      });
      console.log(`🔌 Microsoft Calendar disconnected for user ${session.user.id}`);
    }

    return NextResponse.json({ success: true, message: `${provider} calendar disconnected` });
  } catch (error: any) {
    console.error('Calendar disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
