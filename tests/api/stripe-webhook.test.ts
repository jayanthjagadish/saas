import { strict as assert } from 'assert';
import { stripe, verifyWebhookSignature, handleWebhookEvent } from '../../packages/api/src/services/stripe.js';

// Simple tests that mock stripe.webhooks.constructEvent and ensure handlers run
async function runTests() {
  // Mock constructEvent to return a payment_intent.succeeded event
  const fakeEvent = {
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_1',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        metadata: {},
      },
    },
  } as any;

  // Backup
  const originalConstruct = stripe.webhooks.constructEvent;
  try {
    stripe.webhooks.constructEvent = (_body: any, _sig: any, _secret: any) => fakeEvent as any;

    const event = await verifyWebhookSignature(JSON.stringify({}), 'sig123');
    assert.equal(event.id, 'evt_test_1');

    // Call handler (should not throw)
    await handleWebhookEvent(event as any);
    console.log('payment_intent.succeeded handled');

    // Now test payment_intent.payment_failed
    const failedEvent = { ...fakeEvent, id: 'evt_test_2', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_test_failed', amount: 1000, currency: 'usd', metadata: {} } } } as any;
    stripe.webhooks.constructEvent = () => failedEvent as any;
    const evt2 = await verifyWebhookSignature(JSON.stringify({}), 'sig123');
    await handleWebhookEvent(evt2 as any);
    console.log('payment_intent.payment_failed handled');

    // And subscription.deleted
    const subDelEvent = { id: 'evt_test_3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_test_1', current_period_end: Math.floor(Date.now()/1000)} } } as any;
    stripe.webhooks.constructEvent = () => subDelEvent as any;
    const evt3 = await verifyWebhookSignature(JSON.stringify({}), 'sig123');
    await handleWebhookEvent(evt3 as any);
    console.log('customer.subscription.deleted handled');

    console.log('All stripe webhook handler smoke tests passed');
  } finally {
    stripe.webhooks.constructEvent = originalConstruct;
  }
}

runTests().catch(err => {
  console.error('Tests failed', err);
  process.exit(1);
});
