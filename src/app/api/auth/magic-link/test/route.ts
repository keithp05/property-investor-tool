import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/magic-link/test
 * Test the magic link system (public endpoint for debugging)
 */
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Test 1: Check if MagicLink table exists and is accessible
  try {
    const count = await (prisma as any).magicLink.count();
    results.magicLinkTable = { success: true, count };
  } catch (e: any) {
    results.magicLinkTable = { success: false, error: e.message, code: e.code };
  }

  // Test 2: Check if we can create a test record
  try {
    const testToken = `test_${Date.now()}`;
    const created = await (prisma as any).magicLink.create({
      data: {
        email: 'test@test.com',
        token: testToken,
        expires: new Date(Date.now() + 60000),
        mfaPending: false,
      },
    });
    results.createRecord = { success: true, id: created.id };

    // Clean up test record
    await (prisma as any).magicLink.delete({
      where: { id: created.id },
    });
    results.deleteRecord = { success: true };
  } catch (e: any) {
    results.createRecord = { success: false, error: e.message, code: e.code };
  }

  // Test 3: Check email config
  results.emailConfig = {
    resendApiKey: process.env.RESEND_API_KEY ? 'SET (hidden)' : 'NOT SET',
    fromEmail: process.env.FROM_EMAIL || 'NOT SET (will use default)',
    nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
  };

  // Test 4: Check if a test user exists
  try {
    const userCount = await prisma.user.count();
    results.userTable = { success: true, count: userCount };
  } catch (e: any) {
    results.userTable = { success: false, error: e.message };
  }

  return NextResponse.json(results);
}
