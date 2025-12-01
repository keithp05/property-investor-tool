import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/make-super-admin
 * Make the current user a super admin
 * Only works if:
 * 1. No super admin exists yet (first setup), OR
 * 2. A valid ADMIN_SECRET is provided
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    
    const body = await request.json().catch(() => ({}));
    const { secret } = body;

    // Check if any super admin exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    // If super admin exists, require the secret
    if (existingSuperAdmin) {
      const adminSecret = process.env.ADMIN_SECRET;
      
      if (!adminSecret) {
        return NextResponse.json({ 
          success: false, 
          error: 'Super admin already exists. Contact system administrator.' 
        }, { status: 403 });
      }

      if (secret !== adminSecret) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid admin secret' 
        }, { status: 403 });
      }
    }

    // Make the current user a super admin
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        role: 'SUPER_ADMIN',
        subscriptionTier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionTier: true,
      },
    });

    // Log this action
    try {
      await prisma.adminAuditLog.create({
        data: {
          adminId: userId,
          adminEmail: userEmail || '',
          action: 'SUPER_ADMIN_CREATED',
          targetType: 'User',
          targetId: userId,
          details: { 
            isFirstSuperAdmin: !existingSuperAdmin,
            email: userEmail,
          },
        },
      });
    } catch (e) {
      // Audit log table might not exist yet
      console.log('Could not log admin action (table may not exist yet)');
    }

    return NextResponse.json({
      success: true,
      message: 'You are now a Super Admin!',
      user: updatedUser,
    });

  } catch (error: any) {
    console.error('Make super admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create super admin', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/make-super-admin
 * Check if super admin exists
 */
export async function GET(request: NextRequest) {
  try {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      superAdminExists: !!existingSuperAdmin,
    });

  } catch (error: any) {
    console.error('Check super admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check super admin status', details: error.message },
      { status: 500 }
    );
  }
}
