import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Delete a property owned by the authenticated landlord
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: propertyId } = await params;

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

    // Check if property exists and belongs to this landlord
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        currentTenancy: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.landlordId !== landlordProfile.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this property' },
        { status: 403 }
      );
    }

    // Check if property has active tenant (lease hasn't expired)
    if (property.currentTenancy && new Date(property.currentTenancy.leaseEndDate) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete property with active tenant. Please end the lease first.',
        },
        { status: 400 }
      );
    }

    // Delete the property (cascade will handle related records based on schema)
    await prisma.property.delete({
      where: { id: propertyId },
    });

    console.log('✅ Property deleted:', propertyId);

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Error deleting property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete property',
      },
      { status: 500 }
    );
  }
}

/**
 * Update a property's financial details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: propertyId } = await params;
    const body = await request.json();

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

    // Check if property exists and belongs to this landlord
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.landlordId !== landlordProfile.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this property' },
        { status: 403 }
      );
    }

    // Build update data object with only provided fields
    const updateData: any = {};

    if (body.monthlyRent !== undefined) {
      updateData.monthlyRent = body.monthlyRent;
    }
    if (body.estimatedValue !== undefined) {
      updateData.estimatedValue = body.estimatedValue;
    }
    if (body.purchasePrice !== undefined) {
      updateData.purchasePrice = body.purchasePrice;
    }
    if (body.mortgage !== undefined) {
      updateData.monthlyMortgage = body.mortgage;
    }

    // Update the property and fetch with all relations
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: updateData,
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
          },
        },
        maintenanceRequests: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        rentPayments: {
          orderBy: {
            dueDate: 'desc',
          },
          take: 10,
        },
      },
    });

    // Transform currentTenancy data to match expected format
    const transformedProperty = {
      ...updatedProperty,
      currentTenancy: updatedProperty.currentTenancy ? {
        tenant: {
          name: updatedProperty.currentTenancy.tenantProfile.user.name || 'Unknown',
          email: updatedProperty.currentTenancy.tenantProfile.user.email,
        },
        leaseStartDate: updatedProperty.currentTenancy.leaseStartDate,
        leaseEndDate: updatedProperty.currentTenancy.leaseEndDate,
        rentAmount: updatedProperty.currentTenancy.rentAmount,
        securityDeposit: updatedProperty.currentTenancy.securityDeposit,
      } : null,
    };

    console.log('✅ Property updated:', propertyId);

    return NextResponse.json({
      success: true,
      property: transformedProperty,
    });

  } catch (error: any) {
    console.error('❌ Error updating property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update property',
      },
      { status: 500 }
    );
  }
}

/**
 * Get a single property by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: propertyId } = await params;

    // Fetch property with related data
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        landlord: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
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
          },
        },
        maintenanceRequests: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        rentPayments: {
          orderBy: {
            dueDate: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Transform currentTenancy data to match expected format
    const transformedProperty = {
      ...property,
      currentTenancy: property.currentTenancy ? {
        tenant: {
          name: property.currentTenancy.tenantProfile.user.name || 'Unknown',
          email: property.currentTenancy.tenantProfile.user.email,
        },
        leaseStartDate: property.currentTenancy.leaseStartDate,
        leaseEndDate: property.currentTenancy.leaseEndDate,
        rentAmount: property.currentTenancy.rentAmount,
        securityDeposit: property.currentTenancy.securityDeposit,
      } : null,
    };

    return NextResponse.json({
      success: true,
      property: transformedProperty,
    });

  } catch (error: any) {
    console.error('❌ Error fetching property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch property',
      },
      { status: 500 }
    );
  }
}
