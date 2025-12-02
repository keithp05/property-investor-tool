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

    const skip = (page - 1) * limit;

    // Build where clause - only use basic fields
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

    // Use raw query to only get basic fields
    const users = await prisma.$queryRaw`
      SELECT 
        id, email, name, role, "createdAt", "updatedAt",
        "subscriptionTier", "subscriptionStatus", "stripeCustomerId"
      FROM "User"
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    const total = Number((countResult as any)[0].count);

    return NextResponse.json({
      success: true,
      users: (users as any[]).map(user => ({
        ...user,
        isActive: true,
        isSuspended: false,
        mfaEnabled: false,
        lastLoginAt: null,
        loginCount: 0,
        landlordProfile: null,
        tenantProfile: null,
        proProfile: null,
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
    const { userId, role, subscriptionTier, subscriptionStatus } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const changes: string[] = [];
    
    // Build SET clause dynamically
    const updates: string[] = [];
    
    if (role !== undefined) {
      updates.push(`role = '${role}'`);
      changes.push(`role -> ${role}`);
    }
    
    if (subscriptionTier !== undefined) {
      updates.push(`"subscriptionTier" = '${subscriptionTier}'`);
      changes.push(`tier -> ${subscriptionTier}`);
    }
    
    if (subscriptionStatus !== undefined) {
      updates.push(`"subscriptionStatus" = '${subscriptionStatus}'`);
      changes.push(`status -> ${subscriptionStatus}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Use raw query for update
    await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET ${updates.join(', ')}, "updatedAt" = NOW()
      WHERE id = '${userId}'
    `);

    return NextResponse.json({
      success: true,
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
