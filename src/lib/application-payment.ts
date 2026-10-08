import Stripe from 'stripe';
import { requireServerEnv } from './server-config';

export class ApplicationPaymentError extends Error {
  constructor(message: string, public status = 402) { super(message); }
}
type Application = { id: string; applicationFee: number; stripePaymentIntentId: string | null };
export function applicationFeeCents(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new ApplicationPaymentError('Invalid application fee', 400);
  return Math.round(amount * 100);
}
export function assertApplicationOpen(application: { status: string; createdAt: Date }) {
  if (application.status !== 'PENDING') throw new ApplicationPaymentError('Application already submitted', 409);
  if (application.createdAt.getTime() <= Date.now() - 30 * 24 * 60 * 60 * 1000) {
    throw new ApplicationPaymentError('This application link has expired', 410);
  }
}
export async function verifyApplicationPayment(application: Application, suppliedId: unknown) {
  const expected = applicationFeeCents(application.applicationFee);
  if (expected === 0) return { applicationFeePaid: true, stripePaymentIntentId: null };
  const id = application.stripePaymentIntentId || suppliedId;
  if (typeof id !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(id)) throw new ApplicationPaymentError('Complete the application fee payment first');
  const stripe = new Stripe(requireServerEnv('STRIPE_SECRET_KEY'));
  let intent: Stripe.PaymentIntent;
  try { intent = await stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] }); }
  catch { throw new ApplicationPaymentError('Unable to confirm the application payment', 503); }
  const charge = intent.latest_charge;
  const refunded = charge && typeof charge !== 'string' ? charge.amount_refunded : 0;
  if (intent.status !== 'succeeded' || intent.currency !== 'usd' ||
      intent.amount !== expected || intent.amount_received - refunded < expected ||
      intent.metadata.applicationId !== application.id) {
    throw new ApplicationPaymentError('Payment does not match this application');
  }
  return { applicationFeePaid: true, stripePaymentIntentId: intent.id };
}
