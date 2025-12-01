import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-session';

/**
 * GET /api/admin/stats
 * Get platform statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all stats in parallel
    const [
      totalUsers,
      landlordCount,
      tenantCount,
      proCount,
      totalProperties,
      totalApplications,
      freeCount,
      proTierCount,
      enterpriseCount,
      activeSubscriptions,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'LANDLORD' } }),
      prisma.user.count({ where: { role: 'TENANT' } }),
      prisma.user.count({ where: { role: 'PRO' } }),
      prisma.property.count(),
      prisma.tenantApplication.count(),
      prisma.user.count({ where: { subscriptionTier: 'FREE' } }),
      prisma.user.count({ where: { subscriptionTier: 'PRO' } }),
      prisma.user.count({ where: { subscriptionTier: 'ENTERPRISE' } }),
      prisma.user.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.user.count({ 
        where: { 
          createdAt: { 
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          } 
        } 
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          landlords: landlordCount,
          tenants: tenantCount,
          pros: proCount,
          recentSignups,
        },
        platform: {
          totalProperties,
          totalApplications,
        },
        subscriptions: {
          free: freeCount,
          pro: proTierCount,
          enterprise: enterpriseCount,
          active: activeSubscriptions,
        },
      },
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
