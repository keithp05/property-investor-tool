const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');
const app = { id: 'application-a', applicationFee: 50, stripePaymentIntentId: null };
const paid = { id: 'pi_dummy', status: 'succeeded', amount: 5000, amount_received: 5000, currency: 'usd', metadata: { applicationId: app.id }, latest_charge: { amount_refunded: 0 } };
function api(result = paid) {
  return load('src/lib/application-payment.ts', {}, { stripe: class { paymentIntents = { retrieve: async () => result }; }, './server-config': { requireServerEnv: () => 'dummy-stripe-key' } });
}
test('client paid flag does not establish payment; missing intent is rejected', async () => {
  await assert.rejects(api().verifyApplicationPayment({ ...app, applicationFeePaid: true }, undefined), /Complete the application fee/);
});
test('only a succeeded payment for this application and exact fee is accepted', async () => {
  assert.equal((await api().verifyApplicationPayment(app, 'pi_dummy')).applicationFeePaid, true);
  for (const change of [{ status: 'processing' }, { metadata: { applicationId: 'another-application' } }, { amount: 1 }, { currency: 'eur' }, { latest_charge: { amount_refunded: 100 } }]) {
    await assert.rejects(api({ ...paid, ...change }).verifyApplicationPayment(app, 'pi_dummy'), /does not match/);
  }
});
test('zero fee needs no provider, while negative fees and expired links are rejected', async () => {
  assert.equal((await api().verifyApplicationPayment({ ...app, applicationFee: 0 })).applicationFeePaid, true);
  assert.throws(() => api().applicationFeeCents(-1), /Invalid application fee/);
  assert.throws(() => api().assertApplicationOpen({ status: 'SUBMITTED', createdAt: new Date() }), /already submitted/);
  assert.throws(() => api().assertApplicationOpen({ status: 'PENDING', createdAt: new Date(0) }), /expired/);
});
