import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

/**
 * GET /api/admin/users
 * List all users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const tier = searchParams.get('tier') || '';

    const skip = (page - 1) * limit;

    // Build where clause - only use fields that definitely exist
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

    // Get users with pagination - only select fields that exist
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
          subscriptionEndsAt: true,
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
        // Add placeholder fields for UI compatibility
        isActive: true,
        isSuspended: false,
        mfaEnabled: false,
        lastLoginAt: null,
        loginCount: 0,
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
      { success: false, error: 'Failed to get users', debug: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role or tier
 */
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId, 
      role, 
      subscriptionTier, 
      subscriptionStatus,
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Build update data - only use fields that exist
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

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User updated: ${changes.join(', ')}`,
    });

  } catch (error: any) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', debug: error.message },
      { status: 500 }
    );
  }
}
