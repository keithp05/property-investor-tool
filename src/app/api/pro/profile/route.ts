import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/pro/profile
 * Get current pro's profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const proProfile = await prisma.proProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            image: true,
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            serviceRequests: true,
            appointments: true,
            reviews: true,
          },
        },
      },
    });

    if (!proProfile) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: proProfile,
    });

  } catch (error: any) {
    console.error('Get pro profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get profile', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pro/profile
 * Update pro's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Find existing profile
    const existingProfile = await prisma.proProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
    }

    // Update profile
    const updatedProfile = await prisma.proProfile.update({
      where: { id: existingProfile.id },
      data: {
        businessName: data.businessName,
        phone: data.phone,
        businessAddress: data.businessAddress,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        serviceRadius: data.serviceRadius,
        serviceCategories: data.serviceCategories,
        specialties: data.specialties,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        callOutFee: data.callOutFee ? parseFloat(data.callOutFee) : null,
        emergencyRate: data.emergencyRate ? parseFloat(data.emergencyRate) : null,
        acceptsEmergency: data.acceptsEmergency,
        availability: data.availability,
        bio: data.bio,
        licenseNumber: data.licenseNumber,
        insuranceProvider: data.insuranceProvider,
        insurancePolicyNumber: data.insurancePolicyNumber,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });

  } catch (error: any) {
    console.error('Update pro profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}
