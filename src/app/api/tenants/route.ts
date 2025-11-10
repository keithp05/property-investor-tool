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

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a landlord
    if (session.user.role !== 'LANDLORD') {
      return NextResponse.json(
        { error: 'Only landlords can access tenant data' },
        { status: 403 }
      );
    }

    // Get landlord profile
    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlordProfile) {
      return NextResponse.json(
        { error: 'Landlord profile not found' },
        { status: 404 }
      );
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
                phone: true,
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

    // Format response
    const formattedTenants = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.tenantProfile.user.name,
      email: tenant.tenantProfile.user.email,
      phone: tenant.tenantProfile.user.phone,
      property: {
        id: tenant.property.id,
        address: tenant.property.address,
        city: tenant.property.city,
        state: tenant.property.state,
        zipCode: tenant.property.zipCode,
        fullAddress: `${tenant.property.address}, ${tenant.property.city}, ${tenant.property.state} ${tenant.property.zipCode}`,
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
        error: 'Failed to fetch tenants',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
