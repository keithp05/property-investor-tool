import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Dashboard API - Returns complete overview of landlord's properties
 * Includes: stats, properties with alerts, maintenance requests, rent status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and landlord profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        landlordProfile: true,
      },
    });

    if (!user?.landlordProfile) {
      return NextResponse.json(
        { success: false, error: 'Landlord profile not found' },
        { status: 404 }
      );
    }

    const landlordId = user.landlordProfile.id;

    // Fetch all properties with complete details
    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        currentTenancy: {
          include: {
            tenantProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            rentPayments: {
              orderBy: { dueDate: 'desc' },
              take: 3,
            },
          },
        },
        maintenanceRequests: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          orderBy: { createdAt: 'desc' },
        },
        rentPayments: {
          where: {
            dueDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          orderBy: { dueDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'OCCUPIED').length;
    const vacantProperties = properties.filter(p => p.status === 'VACANT').length;

    // Calculate monthly revenue (sum of all monthly rent for occupied properties)
    const monthlyRevenue = properties
      .filter(p => p.status === 'OCCUPIED' && p.monthlyRent)
      .reduce((sum, p) => sum + Number(p.monthlyRent || 0), 0);

    // Count maintenance requests
    const openMaintenanceRequests = properties.reduce(
      (sum, p) => sum + p.maintenanceRequests.length,
      0
    );

    // Get all rent payments for current month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const allRentPayments = await prisma.rentPayment.findMany({
      where: {
        property: { landlordId },
        dueDate: { gte: currentMonth },
      },
    });

    const paidRentCount = allRentPayments.filter(p => p.status === 'PAID').length;
    const pendingRentCount = allRentPayments.filter(p => p.status === 'PENDING').length;
    const overdueRentCount = allRentPayments.filter(p => p.status === 'OVERDUE').length;

    // Build property cards with alerts
    const propertyCards = properties.map(property => {
      const alerts = [];

      // Check for maintenance requests
      if (property.maintenanceRequests.length > 0) {
        const urgentCount = property.maintenanceRequests.filter(
          m => m.priority === 'HIGH' || m.priority === 'URGENT'
        ).length;

        alerts.push({
          type: 'maintenance',
          severity: urgentCount > 0 ? 'urgent' : 'warning',
          message: urgentCount > 0
            ? `${urgentCount} urgent maintenance request${urgentCount > 1 ? 's' : ''}`
            : `${property.maintenanceRequests.length} open maintenance request${property.maintenanceRequests.length > 1 ? 's' : ''}`,
          count: property.maintenanceRequests.length,
        });
      }

      // Check rent status
      if (property.currentTenancy) {
        const currentMonthPayment = property.rentPayments.find(
          payment => payment.dueDate >= currentMonth
        );

        if (currentMonthPayment) {
          if (currentMonthPayment.status === 'OVERDUE') {
            const daysLate = Math.floor(
              (now.getTime() - currentMonthPayment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            alerts.push({
              type: 'rent',
              severity: 'urgent',
              message: `Rent overdue by ${daysLate} days`,
              amount: Number(currentMonthPayment.amount),
            });
          } else if (currentMonthPayment.status === 'PENDING') {
            const daysUntilDue = Math.floor(
              (currentMonthPayment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilDue <= 5) {
              alerts.push({
                type: 'rent',
                severity: 'warning',
                message: `Rent due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                amount: Number(currentMonthPayment.amount),
              });
            }
          }
        }
      }

      // Check for vacant property
      if (property.status === 'VACANT') {
        alerts.push({
          type: 'vacancy',
          severity: 'info',
          message: 'Property is vacant',
        });
      }

      // Check mortgage status if exists
      if (property.mortgagePaymentStatus === 'LATE' || property.mortgagePaymentStatus === 'BEHIND') {
        alerts.push({
          type: 'mortgage',
          severity: 'urgent',
          message: `Mortgage payment ${property.mortgagePaymentStatus.toLowerCase()}`,
        });
      }

      return {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        status: property.status,
        monthlyRent: property.status === 'VACANT' ? null : (property.monthlyRent ? Number(property.monthlyRent) : null),
        marketRent: property.marketRent ? Number(property.marketRent) : null,
        section8FMR: property.section8FMR ? Number(property.section8FMR) : null,
        section8ContactPhone: property.section8ContactPhone,
        estimatedValue: property.estimatedValue ? Number(property.estimatedValue) : null,
        monthlyMortgage: property.monthlyMortgage ? Number(property.monthlyMortgage) : null,
        mortgageBalance: property.mortgageBalance ? Number(property.mortgageBalance) : null,
        tenant: property.currentTenancy ? {
          name: property.currentTenancy.tenantProfile.user.name,
          email: property.currentTenancy.tenantProfile.user.email,
          leaseEndDate: property.currentTenancy.leaseEndDate,
        } : null,
        alerts,
        maintenanceCount: property.maintenanceRequests.length,
      };
    });

    // Sort properties by alert severity (urgent first)
    propertyCards.sort((a, b) => {
      const aUrgent = a.alerts.filter(al => al.severity === 'urgent').length;
      const bUrgent = b.alerts.filter(al => al.severity === 'urgent').length;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;

      const aWarning = a.alerts.filter(al => al.severity === 'warning').length;
      const bWarning = b.alerts.filter(al => al.severity === 'warning').length;
      return bWarning - aWarning;
    });

    // Get recent maintenance requests across all properties
    const recentMaintenance = await prisma.maintenanceRequest.findMany({
      where: {
        property: { landlordId },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
        tenant: {
          include: {
            tenantProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalProperties,
        occupiedProperties,
        vacantProperties,
        monthlyRevenue,
        openMaintenanceRequests,
        rentStatus: {
          paid: paidRentCount,
          pending: pendingRentCount,
          overdue: overdueRentCount,
        },
      },
      properties: propertyCards,
      recentMaintenance: recentMaintenance.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        priority: m.priority,
        status: m.status,
        property: `${m.property.address}, ${m.property.city}, ${m.property.state}`,
        tenant: m.tenant.tenantProfile.user.name,
        createdAt: m.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('❌ Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
