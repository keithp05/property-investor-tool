import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tenants
 * Fetch all tenants for the logged-in landlord
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Check if user is a landlord
    if (userRole !== 'LANDLORD') {
      return NextResponse.json(
        { success: false, error: 'Only landlords can access tenant data' },
        { status: 403 }
      );
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
    });

    if (!landlordProfile) {
      // Return empty tenants list instead of error
      return NextResponse.json({
        success: true,
        tenants: [],
      });
    }

    // Fetch all tenants for this landlord with their property details
    const tenants = await prisma.tenant.findMany({
      where: {
        landlordId: landlordProfile.id,
      },
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
        property: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: {
        leaseStartDate: 'desc',
      },
    });

    // Format response with null checks
    const formattedTenants = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.tenantProfile?.user?.name || 'Unknown',
      email: tenant.tenantProfile?.user?.email || 'Unknown',
      phone: tenant.tenantProfile?.phone || null,
      property: {
        id: tenant.property?.id || '',
        address: tenant.property?.address || '',
        city: tenant.property?.city || '',
        state: tenant.property?.state || '',
        zipCode: tenant.property?.zipCode || '',
        fullAddress: tenant.property 
          ? `${tenant.property.address}, ${tenant.property.city}, ${tenant.property.state} ${tenant.property.zipCode}`
          : 'Unknown',
      },
      lease: {
        startDate: tenant.leaseStartDate,
        endDate: tenant.leaseEndDate,
        monthlyRent: tenant.monthlyRent,
        securityDeposit: tenant.securityDeposit,
        signed: tenant.leaseSigned,
      },
    }));

    return NextResponse.json({
      success: true,
      tenants: formattedTenants,
    });

  } catch (error: any) {
    console.error('Fetch tenants error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tenants',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
