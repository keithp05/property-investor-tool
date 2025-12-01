import { NextRequest, NextResponse } from 'next/server';
import { createFirstSuperAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/auth/setup
 * Create the first super admin account
 * Only works when no admin accounts exist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, setupKey } = body;

    // Verify setup key (add this to your env vars)
    const validSetupKey = process.env.ADMIN_SETUP_KEY || 'rentaliq-admin-setup-2024';
    
    if (setupKey !== validSetupKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid setup key' },
        { status: 403 }
      );
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await createFirstSuperAdmin(email, password, name);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin account created successfully',
      admin: result.admin,
    });

  } catch (error: any) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during setup' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth/setup
 * Check if setup is needed (no admins exist)
 */
export async function GET(request: NextRequest) {
  try {
    const adminCount = await prisma.adminUser.count();

    return NextResponse.json({
      success: true,
      needsSetup: adminCount === 0,
      adminCount,
    });

  } catch (error: any) {
    console.error('Admin setup check error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
