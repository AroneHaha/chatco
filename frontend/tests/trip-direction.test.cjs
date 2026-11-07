/* eslint-disable @typescript-eslint/no-require-imports -- Node test runs the TS module without a browser. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/shared/map/trip-direction.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = {};
vm.runInNewContext(source, { exports: mod, Math, Number, WeakMap });

// About 1 km legs around Malolos latitude.
const D = 0.009;
const at = (lat, lng) => [14.85 + lat, 120.8 + lng];

test('8-way facing picks the nearest compass direction', () => {
  assert.equal(mod.facingFor(0), 'n');
  assert.equal(mod.facingFor(130), 'se');
  assert.equal(mod.facingFor(159), 's'); // closer to 180 than 135
  assert.equal(mod.facingFor(173), 's');
  assert.equal(mod.facingFor(290), 'w');
  assert.equal(mod.facingFor(303), 'nw');
  assert.equal(mod.facingFor(359), 'n');
});

test('forward follows the line toward its end, reverse toward its start', () => {
  // Straight line running down-right (south-east).
  const route = [at(0, 0), at(-D, D), at(-2 * D, 2 * D)];
  const mid = at(-D, D);
  assert.deepEqual({ ...mod.unitHeading(route, mid[0], mid[1], 'FORWARD') }, { facing: 'se', arrow: 135 });
  assert.deepEqual({ ...mod.unitHeading(route, mid[0], mid[1], 'REVERSE') }, { facing: 'nw', arrow: 315 });
});

test('unit off the line snaps to the nearest stretch, and the bus follows the road ahead', () => {
  // Down, then a sharp turn right (east).
  const route = [at(0, 0), at(-D, 0), at(-D, D)];
  const beforeTurn = mod.unitHeading(route, 14.85 - D * 0.3, 120.8 + 0.0002, 'FORWARD');
  assert.equal(beforeTurn.facing, 's');
  assert.equal(beforeTurn.arrow, 180);
  const afterTurn = mod.unitHeading(route, 14.85 - D - 0.0002, 120.8 + D * 0.6, 'FORWARD');
  assert.equal(afterTurn.facing, 'e');
  assert.equal(afterTurn.arrow, 90);
});

test('at the end of the trip it keeps the last direction instead of failing', () => {
  const route = [at(0, 0), at(-D, D)];
  const end = at(-D, D);
  assert.equal(mod.unitHeading(route, end[0], end[1], 'FORWARD').facing, 'se');
  const start = at(0, 0);
  assert.equal(mod.unitHeading(route, start[0], start[1], 'REVERSE').facing, 'nw');
});

test('no usable route line gives no heading', () => {
  assert.equal(mod.unitHeading([], 14.85, 120.8, 'FORWARD'), null);
  assert.equal(mod.unitHeading([at(0, 0)], 14.85, 120.8, 'FORWARD'), null);
  assert.equal(mod.unitHeading([at(0, 0), at(0, 0)], 14.85, 120.8, 'FORWARD'), null);
});

test('labels and parsing', () => {
  assert.equal(mod.tripLabel('FORWARD'), 'Calumpit → Meycauayan');
  assert.equal(mod.tripLabel('REVERSE'), 'Meycauayan → Calumpit');
  assert.equal(mod.toTripDirection('REVERSE'), 'REVERSE');
  assert.equal(mod.toTripDirection(undefined), 'FORWARD');
  assert.equal(mod.toTripDirection('junk'), 'FORWARD');
});
