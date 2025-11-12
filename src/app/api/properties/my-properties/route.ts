import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Get all properties owned by the authenticated landlord
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      return NextResponse.json(
        { success: false, error: 'Landlord profile not found' },
        { status: 403 }
      );
    }

    // Fetch all properties for this landlord
    const properties = await prisma.property.findMany({
      where: {
        landlordId: landlordProfile.id,
      },
      include: {
        currentTenancy: {
          select: {
            id: true,
            tenantProfile: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            leaseStartDate: true,
            leaseEndDate: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format properties for UI
    const formattedProperties = properties.map((property) => {
      const tenancy = property.currentTenancy;
      // Tenant is active if tenancy exists and lease hasn't expired
      const isActive = tenancy && new Date(tenancy.leaseEndDate) > new Date();

      // Calculate actual status based on tenancy
      // Only show RENTED if there's an active tenant with a valid lease
      let actualStatus = property.status;
      if (isActive) {
        actualStatus = 'RENTED';
      } else if (!isActive && property.status === 'RENTED') {
        // If marked as RENTED but no active tenancy, mark as VACANT
        actualStatus = 'VACANT';
      }

      return {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        yearBuilt: property.yearBuilt,
        propertyType: property.propertyType,
        estimatedValue: property.estimatedValue ? parseFloat(property.estimatedValue.toString()) : null,
        currentValue: property.currentValue ? parseFloat(property.currentValue.toString()) : null,
        marketRent: property.marketRent ? parseFloat(property.marketRent.toString()) : null,
        purchasePrice: property.purchasePrice ? parseFloat(property.purchasePrice.toString()) : null,
        purchaseDate: property.purchaseDate?.toISOString().split('T')[0],
        monthlyMortgage: property.monthlyMortgage ? parseFloat(property.monthlyMortgage.toString()) : null,
        monthlyRent: property.monthlyRent ? parseFloat(property.monthlyRent.toString()) : null,
        mortgageBalance: property.mortgageBalance ? parseFloat(property.mortgageBalance.toString()) : null,
        status: actualStatus,
        currentTenant: isActive && tenancy ? tenancy.tenantProfile.user.name : null,
        leaseEndDate: isActive && tenancy?.leaseEndDate ? tenancy.leaseEndDate.toISOString().split('T')[0] : null,
      };
    });

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
    });

  } catch (error: any) {
    console.error('❌ Error fetching landlord properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch properties',
      },
      { status: 500 }
    );
  }
}
