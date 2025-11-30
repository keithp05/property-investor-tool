import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/pro/register
 * Register a new service professional
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.password || !data.name || !data.businessName || !data.phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (data.serviceCategories?.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one service category' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user and pro profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with PRO role
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: 'PRO',
        },
      });

      // Create pro profile
      const proProfile = await tx.proProfile.create({
        data: {
          userId: user.id,
          businessName: data.businessName,
          phone: data.phone,
          businessAddress: data.businessAddress || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          serviceRadius: parseInt(data.serviceRadius) || 25,
          serviceCategories: data.serviceCategories || [],
          specialties: data.specialties || null,
          hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
          callOutFee: data.callOutFee ? parseFloat(data.callOutFee) : null,
          emergencyRate: data.emergencyRate ? parseFloat(data.emergencyRate) : null,
          acceptsEmergency: data.acceptsEmergency || false,
          licenseNumber: data.licenseNumber || null,
          insuranceProvider: data.insuranceProvider || null,
          insurancePolicyNumber: data.insurancePolicyNumber || null,
          bio: data.bio || null,
        },
      });

      return { user, proProfile };
    });

    console.log(`✅ Pro registered: ${result.user.email} (${result.proProfile.businessName})`);

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      userId: result.user.id,
      proProfileId: result.proProfile.id,
    });

  } catch (error: any) {
    console.error('Pro registration error:', error);
    return NextResponse.json(
      {
        error: 'Registration failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
