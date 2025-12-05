import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/dashboard
 * Redirects to dashboard summary for compatibility
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID not found in session' }, { status: 401 });
    }

    // Get landlord profile with properties
    let landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
      include: {
        properties: {
          include: {
            currentTenancy: true,
            rentPayments: {
              where: {
                status: { in: ['PENDING', 'LATE'] },
              },
              orderBy: { dueDate: 'asc' },
            },
            maintenanceRequests: {
              where: {
                status: { in: ['OPEN', 'IN_PROGRESS'] },
              },
            },
          },
        },
      },
    });

    // Auto-create landlord profile if it doesn't exist
    if (!landlordProfile) {
      await prisma.landlordProfile.create({
        data: { userId },
      });
      landlordProfile = await prisma.landlordProfile.findUnique({
        where: { userId },
        include: {
          properties: {
            include: {
              currentTenancy: true,
              rentPayments: {
                where: {
                  status: { in: ['PENDING', 'LATE'] },
                },
                orderBy: { dueDate: 'asc' },
              },
              maintenanceRequests: {
                where: {
                  status: { in: ['OPEN', 'IN_PROGRESS'] },
                },
              },
            },
          },
        },
      });
    }

    if (!landlordProfile) {
      return NextResponse.json({
        success: true,
        stats: {
          totalProperties: 0,
          occupiedProperties: 0,
          vacantProperties: 0,
          monthlyRevenue: 0,
          openMaintenanceRequests: 0,
          rentStatus: { paid: 0, pending: 0, overdue: 0 },
        },
        properties: [],
        recentMaintenance: [],
      });
    }

    // Calculate totals
    let totalPropertyValue = 0;
    let totalMortgageBalance = 0;
    let totalMonthlyRent = 0;
    let totalMonthlyMortgage = 0;
    
    const properties = landlordProfile.properties.map((property) => {
      const currentValue = Number(property.currentValue || property.estimatedValue || 0);
      const mortgageBalance = Number(property.mortgageBalance || 0);
      const monthlyRent = Number(property.monthlyRent || 0);
      const monthlyMortgage = Number(property.monthlyMortgage || 0);

      totalPropertyValue += currentValue;
      totalMortgageBalance += mortgageBalance;
      totalMonthlyRent += monthlyRent;
      totalMonthlyMortgage += monthlyMortgage;

      return {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        status: property.status,
        monthlyRent,
        monthlyMortgage,
        hasTenant: !!property.currentTenancy,
        pendingPayments: property.rentPayments.length,
        maintenanceCount: property.maintenanceRequests.length,
        alerts: [],
      };
    });

    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'RENTED').length;
    const vacantProperties = properties.filter(p => p.status === 'VACANT').length;
    const openMaintenanceRequests = properties.reduce((sum, p) => sum + p.maintenanceCount, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalProperties,
        occupiedProperties,
        vacantProperties,
        monthlyRevenue: totalMonthlyRent,
        openMaintenanceRequests,
        rentStatus: {
          paid: 0,
          pending: properties.reduce((sum, p) => sum + p.pendingPayments, 0),
          overdue: 0,
        },
      },
      properties,
      recentMaintenance: [],
    });

  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}
