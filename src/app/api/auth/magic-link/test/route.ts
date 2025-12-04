import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/magic-link/test
 * Test the magic link system (public endpoint for debugging)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkToken = searchParams.get('token');
  
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Test 1: Check if MagicLink table exists and list recent links
  try {
    const count = await (prisma as any).magicLink.count();
    const recentLinks = await (prisma as any).magicLink.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        token: true,
        expires: true,
        used: true,
        createdAt: true,
      },
    });
    results.magicLinkTable = { 
      success: true, 
      count,
      recentLinks: recentLinks.map((l: any) => ({
        ...l,
        token: l.token.substring(0, 10) + '...',  // Only show first 10 chars
        isExpired: new Date() > new Date(l.expires),
      })),
    };
  } catch (e: any) {
    results.magicLinkTable = { success: false, error: e.message, code: e.code };
  }

  // Test 2: Check specific token if provided
  if (checkToken) {
    try {
      const link = await (prisma as any).magicLink.findUnique({
        where: { token: checkToken },
      });
      if (link) {
        results.tokenCheck = {
          found: true,
          email: link.email,
          used: link.used,
          expires: link.expires,
          isExpired: new Date() > new Date(link.expires),
          createdAt: link.createdAt,
        };
      } else {
        results.tokenCheck = { found: false };
      }
    } catch (e: any) {
      results.tokenCheck = { error: e.message };
    }
  }

  // Test 3: Check email config
  results.emailConfig = {
    resendApiKey: process.env.RESEND_API_KEY ? 'SET (hidden)' : 'NOT SET',
    fromEmail: process.env.FROM_EMAIL || 'NOT SET (will use default)',
    nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
  };

  // Test 4: Check user count
  try {
    const userCount = await prisma.user.count();
    results.userTable = { success: true, count: userCount };
  } catch (e: any) {
    results.userTable = { success: false, error: e.message };
  }

  return NextResponse.json(results);
}
