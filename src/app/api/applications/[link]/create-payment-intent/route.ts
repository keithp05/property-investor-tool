import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/applications/[link]/create-payment-intent
 * Create a Stripe payment intent for application fee
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { link: string } }
) {
  try {
    const { link } = params;

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
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (application.applicationFeePaid) {
      return NextResponse.json(
        { error: 'Application fee already paid' },
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
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment intent',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
