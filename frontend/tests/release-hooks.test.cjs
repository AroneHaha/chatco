/* eslint-disable @typescript-eslint/no-require-imports -- Node harness loads TypeScript hooks without a browser. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const settle = () => new Promise(resolve => setImmediate(resolve));

function hook(file, name, modules) {
  const slots = [];
  let cursor = 0;
  const effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const slot = slots[cursor++] ?? (slots[cursor - 1] = { value: typeof initial === "function" ? initial() : initial });
      return [slot.value, value => { slot.value = typeof value === "function" ? value(slot.value) : value; }];
    },
    useRef(value) { return slots[cursor++] ?? (slots[cursor - 1] = { current: value }); },
    useCallback(callback, deps) {
      const slot = slots[cursor++] ?? (slots[cursor - 1] = {});
      if (!same(slot.deps, deps)) Object.assign(slot, { callback, deps });
      return slot.callback;
    },
    useEffect(callback, deps) {
      const slot = slots[cursor++] ?? (slots[cursor - 1] = {});
      if (!same(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = callback(); });
      }
    },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: id => id === "react" ? react : modules[id] });
  return () => {
    cursor = 0;
    const result = exports[name]();
    while (effects.length) effects.shift()();
    return result;
  };
}

test("dashboard query modals can be dismissed, opened manually, and opened by later navigation", () => {
  let query = "scan=true";
  const render = hook("app/(commuter)/dashboard/use-dashboard.ts", "useDashboard", {
    "next/navigation": { useSearchParams: () => new URLSearchParams(query) },
    "@/contexts/auth-context": { useAuth: () => ({ commuterProfile: null, isLoading: false }) },
    "@/types": { getCommuterTypeLabel: () => "" },
  });
  assert.equal(render().showScan, true);
  render().setShowScan(false);
  assert.equal(render().showScan, false);
  query = "share-ride=true";
  assert.equal(render().showShareRide, true);
  render().setShowShareRide(false);
  assert.equal(render().showShareRide, false);
  query = "";
  render();
  query = "scan=true";
  assert.equal(render().showScan, true);
  query = "";
  render();
  render().setShowScan(true);
  assert.equal(render().showScan, true);
  query = "scan=true";
  assert.equal(render().showScan, true);
});

test("ratings loads all-time metrics without an active shift and supports refresh", async () => {
  const requested = [];
  const render = hook("app/(conductor)/hooks/use-conductor-ratings.ts", "useConductorRatings", {
    "@/lib/conductor/services/ratings.service": {
      fetchAllTimeRatingMetrics: async () => { requested.push("all_time"); return { metrics: { totalRatings: 6 }, error: null }; },
      calculateMetrics: () => ({ totalRatings: 0 }),
    },
  });
  assert.equal(render().status, "loading");
  await settle();
  assert.equal(render().status, "success");
  assert.deepEqual(requested, ["all_time"]);
  assert.equal(render().metrics.totalRatings, 6);
  await render().refresh();
  assert.equal(render().status, "success");
  assert.deepEqual(requested, ["all_time", "all_time"]);
});

test("a superseded verification request cannot overwrite a refreshed assignment", async () => {
  let finishFirst;
  let calls = 0;
  const user = { id: "user", email: "user@test.com" };
  const render = hook("app/(conductor)/hooks/use-unit-verification.ts", "useUnitVerification", {
    "@/contexts/auth-context": { useAuth: () => ({ user }) },
    "@/lib/conductor/services/units.service": {
      fetchConductorProfile: async () => ({ profile: { id: "user" }, error: null }),
      fetchUnits: () => ++calls === 1
        ? new Promise(resolve => { finishFirst = resolve; })
        : Promise.resolve({ units: [{ id: "new-unit" }], error: null }),
      fetchDrivers: async () => ({ drivers: [], error: null }),
    },
  });
  render();
  await render().refresh();
  finishFirst({ units: [{ id: "old-unit" }], error: null });
  await settle();
  assert.equal(render().units[0].id, "new-unit");
  assert.equal(render().status, "success");
});
