const test = require('node:test');
const assert = require('node:assert/strict');
const { loadWithFakeDb } = require('./helpers');

const GB = 1024 ** 3;
const MB = 1024 ** 2;

function loadEntitlements({ captures, plan = { cloudStorageBytes: BigInt(25 * GB), maxFileSizeBytes: BigInt(256 * MB) } }) {
  return loadWithFakeDb('../src/services/entitlementService', {
    user: { findUnique: async () => ({ id: 'user_1', subscription: { status: 'active', plan }, usage: null }) },
    plan: { findUnique: async () => plan },
    capture: { findMany: async () => captures },
  });
}

const cloudFile = (bytes, status = 'ready') => ({ storageObject: { provider: 'upload_thing', status, sizeBytes: BigInt(bytes) } });

test('upload is allowed while under the storage limit', async () => {
  const svc = loadEntitlements({ captures: [cloudFile(1 * GB)] });
  const result = await svc.checkQuota('user_1', 10 * MB, 'upload_thing');
  assert.equal(result.allowed, true);
});

test('upload is refused once stored cloud files reach the limit', async () => {
  const svc = loadEntitlements({ captures: [cloudFile(25 * GB)] });
  const result = await svc.checkQuota('user_1', 10 * MB, 'upload_thing');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'quota_exceeded');
});

test('files larger than the plan allows are refused', async () => {
  const svc = loadEntitlements({ captures: [] });
  const result = await svc.checkQuota('user_1', 300 * MB, 'upload_thing');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'file_too_large');
});

test('only ready cloud files count, so deleted/failed files free up space', async () => {
  const svc = loadEntitlements({
    captures: [cloudFile(25 * GB, 'deleted'), { storageObject: { provider: 'local', status: 'ready', sizeBytes: BigInt(25 * GB) } }],
  });
  const result = await svc.checkQuota('user_1', 10 * MB, 'upload_thing');
  assert.equal(result.allowed, true);
});

test('local and Drive uploads are not limited by the cloud quota', async () => {
  const svc = loadEntitlements({ captures: [cloudFile(25 * GB)] });
  assert.equal((await svc.checkQuota('user_1', 10 * MB, 'local')).allowed, true);
  assert.equal((await svc.checkQuota('user_1', 10 * MB, 'google_drive')).allowed, true);
});
