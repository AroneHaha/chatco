/* eslint-disable @typescript-eslint/no-require-imports -- Node tests load transpiled TypeScript through CommonJS. */
// The scan modal's preview must match TransactionService::planGroupVouchers();
// these mirror the backend cases in TransactionFlowTest.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../lib/commuter/group-voucher-plan.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { exports: mod.exports, module: mod, Map, Set, Math });
const { planGroupVouchers } = mod.exports;
// Results are built in the vm realm; copy into this realm before deepEqual.
const plain = (value) => JSON.parse(JSON.stringify(value));

const seat = (position, fare, passengerType = 'REGULAR') => ({ position, fare, passengerType, isPayer: position === 1 });
const free = (id) => ({ id, type: 'REWARD', amount: null, expiresAt: null });
const off = (id, amount) => ({ id, type: 'DISCOUNT', amount, expiresAt: null });

test('two free rides leave two of four seats to pay', () => {
  const plan = planGroupVouchers([seat(1, 17), seat(2, 17), seat(3, 17), seat(4, 17)], [free('a'), free('b')]);
  assert.equal(plan.remaining, 34);
  assert.deepEqual(plain(plan.freeSeats.map((s) => s.position)), [1, 2]);
  assert.deepEqual(plain(plan.unused), []);
});

test('free rides take the dearest seats and a large discount carries over', () => {
  const seats = [seat(1, 17), seat(2, 17), seat(3, 13.6, 'PWD'), seat(4, 13.6, 'PWD')];
  const plan = planGroupVouchers(seats, [free('a'), off('d', 20)]);
  assert.equal(plan.remaining, 24.2);
  assert.deepEqual(plain([...plan.fares.values()]), [0, 0, 10.6, 13.6]);
  assert.equal(plan.discountTotal, 20);
});

test('a discount never takes the total below zero', () => {
  const plan = planGroupVouchers([seat(1, 17), seat(2, 13.6, 'STUDENT')], [off('d', 50)]);
  assert.equal(plan.remaining, 0);
  assert.equal(plan.discountTotal, 30.6);
});

test('vouchers that would reduce nothing are reported as unused', () => {
  const plan = planGroupVouchers([seat(1, 17), seat(2, 17)], [free('a'), free('b'), free('c'), off('z', 0)]);
  assert.equal(plan.remaining, 0);
  assert.deepEqual(plain(plan.unused).sort(), ['c', 'z']);
});
