import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ Payment succeeded:', paymentIntent.id);

        // Update application with payment info
        const applicationId = paymentIntent.metadata.applicationId;

        if (applicationId) {
          await prisma.tenantApplication.update({
            where: { id: applicationId },
            data: {
              applicationFeePaid: true,
              stripePaymentIntentId: paymentIntent.id,
            },
          });

          console.log(`✅ Updated application ${applicationId} - payment confirmed`);

          // TODO: Trigger credit/background checks here
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('❌ Payment failed:', paymentIntent.id);

        // TODO: Send email notification to applicant
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('💰 Charge refunded:', charge.id);

        // Update application if payment was refunded
        if (charge.payment_intent) {
          const application = await prisma.tenantApplication.findFirst({
            where: { stripePaymentIntentId: charge.payment_intent as string },
          });

          if (application) {
            await prisma.tenantApplication.update({
              where: { id: application.id },
              data: { applicationFeePaid: false },
            });

            console.log(`✅ Updated application ${application.id} - payment refunded`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
