/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node tests load TypeScript directly. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    assert.ok(id in modules, `Unexpected module ${id}`);
    return modules[id];
  }, URLSearchParams });
  return exports;
}

test('conductor fare modal has no DEV force-paid button, handler, or simulation import', () => {
  const source = fs.readFileSync(path.join(__dirname, '../components/conductor/modals/fare-calculator-modal.tsx'), 'utf8');
  const tree = ts.createSourceFile('fare-calculator-modal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const identifiers = [], imports = [], text = [];
  function visit(node) {
    if (ts.isIdentifier(node)) identifiers.push(node.text);
    if (ts.isImportSpecifier(node)) imports.push(node.propertyName?.text ?? node.name.text);
    if (ts.isJsxText(node)) text.push(node.text.trim());
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.equal(identifiers.includes('handleSimulatePayment'), false);
  assert.equal(identifiers.includes('simulatePayment'), false);
  assert.equal(imports.includes('simulate'), false);
  assert.equal(text.some(label => label.includes('[DEV] Simulate Payment Paid')), false);
  for (const preserved of ['initiateGcash', 'fetchPendingGcash', 'fetchStatus', 'cancelPayment']) {
    assert.ok(imports.includes(preserved), `${preserved} remains available`);
  }
});

function paymentService(api) {
  const endpoints = load('lib/conductor/endpoints.ts', {}).CONDUCTOR_API;
  return load('lib/conductor/services/payment.service.ts', {
    '@/lib/api/client': { api, ApiError: class extends Error {} },
    '@/lib/conductor/endpoints': { CONDUCTOR_API: endpoints },
    '@/lib/conductor/persistence/device.store': { CONDUCTOR_DEVICE_TYPE: 'WEB', getConductorDeviceId: () => 'test-device' },
  });
}

test('conductor initiation keeps the provider checkout URL and pending status without simulating payment', async () => {
  const calls = [];
  const service = paymentService({ post: async (url, body) => {
    calls.push({ url, body });
    return { data: { transaction_id: 'transaction', qr_token: 'binding-token', checkout_url: 'https://test.checkout.example/authorize', amount: 25, status: 'PENDING', expires_at: '2026-10-26T12:00:00Z' } };
  } });
  const result = await service.initiateGcash({ finalAmount: 25, from: 'Pickup', to: 'Dropoff' });
  assert.equal(result.checkoutUrl, 'https://test.checkout.example/authorize');
  assert.equal(result.qrToken, 'binding-token');
  assert.equal(result.status, 'pending');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/conductor/payments/gcash/initiate');
  assert.equal(calls[0].body.deviceId, 'test-device');
});

test('interrupted PayMongo checkout retains its URL and processing status when resumed', async () => {
  const service = paymentService({ get: async url => {
    assert.equal(url, '/api/conductor/payments/gcash/pending');
    return { data: { transaction_id: 'transaction', checkout_url: 'https://test.checkout.example/authorize', qr_token: 'binding-token', amount: 25, status: 'PROCESSING', confirmation_delayed: true } };
  } });
  const result = await service.fetchPendingGcash();
  assert.equal(result.checkoutUrl, 'https://test.checkout.example/authorize');
  assert.equal(result.status, 'processing');
  assert.equal(result.confirmationDelayed, true);
});

test('payment polling reflects backend confirmation, never a client success flag', async () => {
  const results = ['PENDING', 'PROCESSING', 'PAID'];
  const service = paymentService({ get: async url => {
    assert.equal(url, '/api/payments/transaction/status');
    return { data: { status: results.shift() } };
  } });
  for (const status of ['pending', 'processing', 'paid']) {
    assert.equal((await service.fetchStatus('transaction')).status, status);
  }
});
