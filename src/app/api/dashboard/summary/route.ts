import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/dashboard/summary
 * Get landlord dashboard summary with net worth, pending actions, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create landlord profile
    let landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
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
            serviceRequests: {
              where: {
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
              },
            },
          },
        },
        tenants: {
          include: {
            rentPayments: {
              where: {
                status: { in: ['PENDING', 'LATE'] },
              },
            },
          },
        },
      },
    });

    // Auto-create landlord profile if it doesn't exist
    if (!landlordProfile) {
      console.log('Creating landlord profile for user:', session.user.id);
      landlordProfile = await prisma.landlordProfile.create({
        data: {
          userId: session.user.id,
        },
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
              serviceRequests: {
                where: {
                  status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
              },
            },
          },
          tenants: {
            include: {
              rentPayments: {
                where: {
                  status: { in: ['PENDING', 'LATE'] },
                },
              },
            },
          },
        },
      });
    }

    // Calculate totals
    let totalPropertyValue = 0;
    let totalMortgageBalance = 0;
    let totalEquity = 0;
    let totalMonthlyRent = 0;
    let totalMonthlyMortgage = 0;
    let liquidNetWorth = 0;
    
    const properties = landlordProfile.properties.map((property) => {
      const currentValue = Number(property.currentValue || property.estimatedValue || 0);
      const mortgageBalance = Number(property.mortgageBalance || 0);
      const equity = currentValue - mortgageBalance;
      const availableEquity = Number(property.availableEquity || Math.max(0, currentValue * 0.8 - mortgageBalance));
      const monthlyRent = Number(property.monthlyRent || 0);
      const monthlyMortgage = Number(property.monthlyMortgage || 0);

      totalPropertyValue += currentValue;
      totalMortgageBalance += mortgageBalance;
      totalEquity += equity;
      totalMonthlyRent += monthlyRent;
      totalMonthlyMortgage += monthlyMortgage;
      liquidNetWorth += availableEquity;

      return {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        status: property.status,
        currentValue,
        mortgageBalance,
        equity,
        availableEquity,
        monthlyRent,
        monthlyMortgage,
        cashFlow: monthlyRent - monthlyMortgage,
        hasTenant: !!property.currentTenancy,
        pendingPayments: property.rentPayments.length,
        openMaintenanceRequests: property.maintenanceRequests.length,
        activeServiceRequests: property.serviceRequests.length,
      };
    });

    // Pending actions
    const pendingActions: any[] = [];

    // Outstanding rent payments
    landlordProfile.properties.forEach((p) => {
      p.rentPayments.forEach((rp) => {
        pendingActions.push({
          type: rp.status === 'LATE' ? 'LATE_RENT' : 'PENDING_RENT',
          priority: rp.status === 'LATE' ? 'HIGH' : 'MEDIUM',
          title: rp.status === 'LATE' ? 'Late Rent Payment' : 'Pending Rent',
          description: `$${Number(rp.amount).toLocaleString()} due for ${p.address}`,
          propertyId: p.id,
          propertyAddress: p.address,
          amount: Number(rp.amount),
          dueDate: rp.dueDate,
        });
      });
    });

    // Open maintenance requests
    landlordProfile.properties.forEach((p) => {
      p.maintenanceRequests.forEach((mr) => {
        pendingActions.push({
          type: 'MAINTENANCE',
          priority: mr.priority === 'EMERGENCY' ? 'HIGH' : mr.priority === 'HIGH' ? 'MEDIUM' : 'LOW',
          title: mr.title,
          description: `Maintenance request at ${p.address}`,
          propertyId: p.id,
          propertyAddress: p.address,
          requestId: mr.id,
          createdAt: mr.createdAt,
        });
      });
    });

    // Active service requests
    landlordProfile.properties.forEach((p) => {
      p.serviceRequests.forEach((sr) => {
        pendingActions.push({
          type: 'SERVICE_REQUEST',
          priority: sr.priority === 'EMERGENCY' ? 'HIGH' : sr.priority === 'HIGH' ? 'MEDIUM' : 'LOW',
          title: sr.title,
          description: `Service request at ${p.address} - ${sr.status}`,
          propertyId: p.id,
          propertyAddress: p.address,
          requestId: sr.id,
          status: sr.status,
        });
      });
    });

    // Sort by priority
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    pendingActions.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    const totalNetWorth = totalPropertyValue - totalMortgageBalance;
    const monthlyCashFlow = totalMonthlyRent - totalMonthlyMortgage;

    return NextResponse.json({
      success: true,
      summary: {
        totalPropertyValue,
        totalMortgageBalance,
        totalNetWorth,
        totalEquity,
        liquidNetWorth,
        totalMonthlyRent,
        totalMonthlyMortgage,
        monthlyCashFlow,
        annualCashFlow: monthlyCashFlow * 12,
        propertyCount: properties.length,
        vacantProperties: properties.filter((p) => p.status === 'VACANT').length,
        rentedProperties: properties.filter((p) => p.status === 'RENTED').length,
        pendingActionsCount: pendingActions.length,
        highPriorityCount: pendingActions.filter((a) => a.priority === 'HIGH').length,
      },
      properties,
      pendingActions: pendingActions.slice(0, 10),
    });

  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard summary', details: error.message },
      { status: 500 }
    );
  }
}
