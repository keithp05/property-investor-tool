# Stripe Integration Setup

## Overview
The tenant application system uses Stripe to collect a $50 non-refundable application fee from prospective tenants.

## Setup Instructions

### 1. Create a Stripe Account
1. Go to https://stripe.com
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Keys

#### Development (Test Mode)
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_...`)
3. Copy your **Secret key** (starts with `sk_test_...`)

#### Production (Live Mode)
1. Complete Stripe account verification
2. Go to https://dashboard.stripe.com/apikeys
3. Copy your **Publishable key** (starts with `pk_live_...`)
4. Copy your **Secret key** (starts with `sk_live_...`)

### 3. Update Environment Variables

Add to `.env`:
```bash
STRIPE_SECRET_KEY="sk_test_..." # Your secret key
STRIPE_PUBLISHABLE_KEY="pk_test_..." # Your publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # Same as above (for client-side)
```

Add to **AWS Amplify** environment variables:
1. Go to AWS Amplify Console
2. Select your app → Environment variables
3. Add:
   - `STRIPE_SECRET_KEY` = `sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`

### 4. Set Up Webhooks (Production Only)

Webhooks allow Stripe to notify your app when payments succeed/fail.

#### Local Development (Optional)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
3. Copy the webhook signing secret (starts with `whsec_...`)
4. Add to `.env`: `STRIPE_WEBHOOK_SECRET="whsec_..."`

#### Production (Required)
1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add to Amplify environment variables: `STRIPE_WEBHOOK_SECRET="whsec_..."`

### 5. Test Payment Flow

#### Using Test Cards
Stripe provides test cards for development:

**Successful Payment:**
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Card Declined:**
- Card Number: `4000 0000 0000 0002`

**Requires 3D Secure:**
- Card Number: `4000 0025 0000 3155`

Full list: https://stripe.com/docs/testing#cards

### 6. Application Flow

1. **Landlord** generates application link for property
2. **Tenant** fills out application form (12 steps)
3. **Step 11**: Tenant pays $50 application fee via Stripe
4. Payment processed immediately
5. Webhook confirms payment → Application marked as paid
6. **Step 12**: Tenant reviews and submits application
7. **Landlord** receives notification with applicant details

### 7. Payment Breakdown

| Item | Cost |
|------|------|
| Application Fee (charged to tenant) | $50.00 |
| Stripe Processing Fee (2.9% + $0.30) | $1.75 |
| Credit Check (future) | ~$25.00 |
| Background Check (future) | ~$25.00 |
| **Net to Landlord** | **-$1.75** |

> **Note:** Consider charging $75-100 to cover costs + profit margin.

### 8. Security Notes

- ✅ Payment processed on Stripe's servers (PCI compliant)
- ✅ Card details never touch your server
- ✅ Webhook signature verification prevents fraud
- ✅ SSL/TLS encryption required in production
- ✅ Non-refundable fee clearly stated to tenant

### 9. Going Live

Before accepting real payments:

1. ✅ Complete Stripe account verification
2. ✅ Switch from test keys to live keys
3. ✅ Set up production webhook endpoint
4. ✅ Test entire flow with real test card
5. ✅ Review Stripe dashboard for successful payment
6. ✅ Update terms of service with refund policy

### 10. Monitoring

**Stripe Dashboard:**
- https://dashboard.stripe.com/payments (view all payments)
- https://dashboard.stripe.com/balance (see your balance)
- https://dashboard.stripe.com/webhooks (webhook logs)

**Application Dashboard:**
- `/applications` - View all applications with payment status
- Green checkmark = Payment received
- Red X = Payment pending

### 11. Troubleshooting

**Payment not showing in database?**
- Check webhook logs in Stripe dashboard
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check application logs for webhook errors

**"Invalid API Key" error?**
- Verify you're using the correct key (test vs live)
- Make sure key starts with `sk_test_` or `sk_live_`
- Regenerate key if compromised

**Payment succeeded but application not updated?**
- Check webhook endpoint is publicly accessible
- Verify webhook signature validation passes
- Check database connection in webhook handler

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Dashboard: https://dashboard.stripe.com/test
- Live Dashboard: https://dashboard.stripe.com
