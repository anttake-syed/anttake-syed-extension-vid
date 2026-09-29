const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { loadWithFakeDb, mockRes } = require('./helpers');

const SECRET = 'test-webhook-secret';
const VARIANT = '12345';

function fakeDb({ plans = ['free', 'cloud'] } = {}) {
  const calls = { subscriptionUpserts: [] };
  const db = {
    calls,
    plan: {
      findUnique: async ({ where }) => (plans.includes(where.name) ? { id: `plan_${where.name}`, name: where.name } : null),
    },
    lemonSqueezyCustomer: { upsert: async () => ({}), findUnique: async () => ({ id: 'cust_1' }) },
    lemonSqueezyEvent: { create: async () => ({}) },
    lemonSqueezyPayment: { create: async () => ({}) },
    subscription: {
      upsert: async (args) => { calls.subscriptionUpserts.push(args); return {}; },
      updateMany: async () => ({}),
    },
  };
  return db;
}

function signedRequest(payload, secret = SECRET) {
  const body = Buffer.from(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return { body, get: (h) => (h === 'X-Signature' ? signature : undefined), requestId: 'test' };
}

const subscriptionCreated = {
  meta: { event_name: 'subscription_created', custom_data: { user_id: 'user_1' } },
  data: { id: 'sub_1', attributes: { variant_id: VARIANT, status: 'active', customer_id: 99, created_at: null, renews_at: null, ends_at: null } },
};

function loadWebhook(db, env = {}) {
  process.env.LS_WEBHOOK_SECRET = SECRET;
  process.env.LEMONSQUEEZY_LIVE_MONTHLY_VARIANT_ID = VARIANT;
  Object.assign(process.env, env);
  return loadWithFakeDb('../src/controllers/lsWebhookController', db);
}

test('webhook rejects a bad signature', async () => {
  const db = fakeDb();
  const { handleWebhook } = loadWebhook(db);
  const res = mockRes();
  await handleWebhook(signedRequest(subscriptionCreated, 'wrong-secret'), res);
  assert.equal(res.statusCode, 403);
  assert.equal(db.calls.subscriptionUpserts.length, 0);
});

test('webhook fails closed when the secret is not configured', async () => {
  const db = fakeDb();
  const { handleWebhook } = loadWebhook(db, { LS_WEBHOOK_SECRET: '' });
  const res = mockRes();
  await handleWebhook(signedRequest(subscriptionCreated, ''), res);
  assert.equal(res.statusCode, 500);
  assert.equal(db.calls.subscriptionUpserts.length, 0);
});

test('a paid checkout variant is recorded on the cloud plan', async () => {
  const db = fakeDb();
  const { handleWebhook } = loadWebhook(db);
  const res = mockRes();
  await handleWebhook(signedRequest(subscriptionCreated), res);
  assert.equal(res.statusCode, 200);
  assert.equal(db.calls.subscriptionUpserts[0].create.planId, 'plan_cloud');
  assert.equal(db.calls.subscriptionUpserts[0].create.status, 'active');
});

test('a paid subscription is still recorded if the cloud plan row is missing', async () => {
  const db = fakeDb({ plans: ['free'] });
  const { handleWebhook } = loadWebhook(db);
  const res = mockRes();
  await handleWebhook(signedRequest(subscriptionCreated), res);
  assert.equal(res.statusCode, 200);
  assert.equal(db.calls.subscriptionUpserts[0].create.planId, 'plan_free');
});

test('public /plans hides draft plans', async () => {
  const { getPlans } = loadWithFakeDb('../src/controllers/planController', {
    plan: { findMany: async () => [{ name: 'free' }, { name: 'basic' }, { name: 'pro' }, { name: 'cloud' }] },
  });
  const res = mockRes();
  await getPlans({}, res);
  assert.deepEqual(res.body.plans.map((p) => p.name), ['free', 'cloud']);
});
