import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

/**
 * POST /api/applications/[link]/create-payment-intent
 * Create a Stripe payment intent for application fee
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ link: string }> }
) {
  try {
    const { link } = await params;

    // Initialize Stripe inside the function to avoid build-time errors
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });

    console.log(`💳 Creating payment intent for application link: ${link}`);

    // Verify application exists
    const application = await prisma.tenantApplication.findUnique({
      where: { applicationLink: link },
      include: {
        property: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!application) {
      console.error(`❌ Application not found for link: ${link}`);
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (application.applicationFeePaid) {
      console.log(`⚠️ Application ${application.id} already paid`);
      return NextResponse.json(
        { success: false, error: 'Application fee already paid' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(application.applicationFee * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        applicationId: application.id,
        applicationLink: link,
        propertyAddress: `${application.property.address}, ${application.property.city}, ${application.property.state}`,
      },
      description: `Rental Application Fee - ${application.property.address}`,
    });

    console.log(`✅ Created payment intent for application ${application.id}: ${paymentIntent.id}`);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: application.applicationFee,
    });

  } catch (error: any) {
    console.error('❌ Create payment intent error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create payment intent',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
