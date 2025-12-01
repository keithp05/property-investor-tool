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

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          subscriptionStatus: true,
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
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        landlordProfile: user.landlordProfile,
        tenantProfile: user.tenantProfile,
        proProfile: user.proProfile,
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
 * Update a user's role, tier, or status
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
    const { userId, role, subscriptionTier, subscriptionStatus } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Build update data
    const updateData: any = {};
    const changes: string[] = [];

    if (role) {
      updateData.role = role;
      changes.push(`role -> ${role}`);
    }
    
    if (subscriptionTier) {
      updateData.subscriptionTier = subscriptionTier;
      changes.push(`tier -> ${subscriptionTier}`);
    }
    
    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus;
      changes.push(`status -> ${subscriptionStatus}`);
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
