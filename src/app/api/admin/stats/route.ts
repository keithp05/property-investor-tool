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

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
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

    // Get counts
    const [
      totalUsers,
      totalLandlords,
      totalTenants,
      totalPros,
      totalProperties,
      totalApplications,
      activeSubscriptions,
      freeUsers,
      proUsers,
      enterpriseUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'LANDLORD' } }),
      prisma.user.count({ where: { role: 'TENANT' } }),
      prisma.user.count({ where: { role: 'PRO' } }),
      prisma.property.count(),
      prisma.tenantApplication.count(),
      prisma.user.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.user.count({ where: { subscriptionTier: 'FREE' } }),
      prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
      prisma.user.count({ where: { subscriptionTier: 'ENTERPRISE' } }),
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSignups = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          landlords: totalLandlords,
          tenants: totalTenants,
          pros: totalPros,
          recentSignups,
        },
        subscriptions: {
          active: activeSubscriptions,
          free: freeUsers,
          pro: proUsers,
          enterprise: enterpriseUsers,
        },
        platform: {
          totalProperties,
          totalApplications,
        },
      },
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get stats', details: error.message },
      { status: 500 }
    );
  }
}
