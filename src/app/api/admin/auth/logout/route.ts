import { NextRequest, NextResponse } from 'next/server';
import { adminLogout } from '@/lib/admin-auth';
import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'admin_session';

export async function POST(request: NextRequest) {
  try {
    await adminLogout();

    // Clear the cookie
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error: any) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
