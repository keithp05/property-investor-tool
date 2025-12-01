import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === 'SUPER_ADMIN';
}

// Helper to log admin actions
async function logAdminAction(adminId: string, adminEmail: string, action: string, targetType?: string, targetId?: string, details?: any) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
      },
    });
  } catch (e) {
    console.error('Failed to log admin action:', e);
  }
}

/**
 * GET /api/admin/users
 * List all users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    if (!(await isSuperAdmin(userId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const tier = searchParams.get('tier') || '';
    const status = searchParams.get('status') || '';
    const billing = searchParams.get('billing') || '';
    const mfa = searchParams.get('mfa') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (tier) {
      where.subscriptionTier = tier;
    }

    if (status) {
      if (status === 'active') {
        where.isActive = true;
        where.isSuspended = false;
      } else if (status === 'suspended') {
        where.isSuspended = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    if (billing) {
      if (billing === 'current') {
        where.subscriptionStatus = 'ACTIVE';
      } else if (billing === 'past_due') {
        where.subscriptionStatus = 'PAST_DUE';
      } else if (billing === 'cancelled') {
        where.subscriptionStatus = 'CANCELLED';
      }
    }

    if (mfa) {
      where.mfaEnabled = mfa === 'enabled';
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          isSuspended: true,
          suspendedAt: true,
          suspendedReason: true,
          lastLoginAt: true,
          lastActiveAt: true,
          loginCount: true,
          mfaEnabled: true,
          mfaVerifiedAt: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          billingEmail: true,
          lastPaymentAt: true,
          lastPaymentAmount: true,
          failedPaymentCount: true,
          nextBillingDate: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
          landlordProfile: {
            select: {
              id: true,
              company: true,
              _count: { select: { properties: true } },
            },
          },
          tenantProfile: {
            select: { id: true },
          },
          proProfile: {
            select: {
              id: true,
              businessName: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        ...user,
        lastPaymentAmount: user.lastPaymentAmount ? Number(user.lastPaymentAmount) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get users', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role, tier, status, MFA, etc.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminEmail = session.user.email || '';
    
    if (!(await isSuperAdmin(adminId))) {
      return NextResponse.json({ success: false, error: 'Access denied. Super Admin only.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      userId, 
      role, 
      subscriptionTier, 
      subscriptionStatus,
      isActive,
      isSuspended,
      suspendedReason,
      mfaEnabled,
      resetMfa,
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Build update data
    const updateData: any = {};
    const changes: string[] = [];

    if (role !== undefined) {
      updateData.role = role;
      changes.push(`role -> ${role}`);
    }
    
    if (subscriptionTier !== undefined) {
      updateData.subscriptionTier = subscriptionTier;
      changes.push(`tier -> ${subscriptionTier}`);
    }
    
    if (subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = subscriptionStatus;
      changes.push(`subscription status -> ${subscriptionStatus}`);
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      changes.push(`active -> ${isActive}`);
    }

    if (isSuspended !== undefined) {
      updateData.isSuspended = isSuspended;
      if (isSuspended) {
        updateData.suspendedAt = new Date();
        updateData.suspendedReason = suspendedReason || 'Suspended by admin';
        changes.push('suspended');
      } else {
        updateData.suspendedAt = null;
        updateData.suspendedReason = null;
        changes.push('unsuspended');
      }
    }

    if (mfaEnabled !== undefined) {
      updateData.mfaEnabled = mfaEnabled;
      changes.push(`MFA -> ${mfaEnabled ? 'enabled' : 'disabled'}`);
    }

    if (resetMfa) {
      updateData.mfaEnabled = false;
      updateData.mfaSecret = null;
      updateData.mfaBackupCodes = [];
      updateData.mfaVerifiedAt = null;
      changes.push('MFA reset');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        mfaEnabled: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    // Log the action
    await logAdminAction(
      adminId,
      adminEmail,
      'USER_UPDATED',
      'User',
      userId,
      { changes, newValues: updateData }
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User updated: ${changes.join(', ')}`,
    });

  } catch (error: any) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}
