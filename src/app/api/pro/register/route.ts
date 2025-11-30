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

    const {
      // User account
      email,
      password,
      name,
      // Business info
      businessName,
      phone,
      businessAddress,
      city,
      state,
      zipCode,
      serviceRadius,
      // Services
      serviceCategories, // Array of ServiceCategory values
      specialties,
      // Rates
      hourlyRate,
      callOutFee,
      emergencyRate,
      acceptsEmergency,
      // Profile
      bio,
    } = data;

    // Validate required fields
    if (!email || !password || !businessName || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, businessName, phone' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and pro profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || businessName,
          role: 'PRO',
        },
      });

      // Create pro profile
      const proProfile = await tx.proProfile.create({
        data: {
          userId: user.id,
          businessName,
          phone,
          businessAddress,
          city,
          state,
          zipCode,
          serviceRadius: serviceRadius || 25,
          serviceCategories: serviceCategories || ['GENERAL_HANDYMAN'],
          specialties,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          callOutFee: callOutFee ? parseFloat(callOutFee) : null,
          emergencyRate: emergencyRate ? parseFloat(emergencyRate) : null,
          acceptsEmergency: acceptsEmergency || false,
          bio,
        },
      });

      return { user, proProfile };
    });

    console.log(`✅ Pro registered: ${result.user.email}`);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      proProfile: {
        id: result.proProfile.id,
        businessName: result.proProfile.businessName,
      },
    });

  } catch (error: any) {
    console.error('Pro registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register', details: error.message },
      { status: 500 }
    );
  }
}
