/* eslint-disable @typescript-eslint/no-require-imports -- Node tests execute the existing TypeScript hooks through CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(file, react, service, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, AbortController, ...globals,
    require(name) {
      if (name === 'react') return { ...React, ...react };
      if (name === '@/lib/shared/services/activity-log.service') return { listForAdmin: service };
      if (name === '@/lib/utils/format') return load('lib/utils/format.ts', react, service);
      if (name === 'next/link') return props => React.createElement('a', props);
      return require(name);
    },
  });
  return exports;
}

// Keep state/ref identity and effect cleanup across renders, so overlapping
// requests and late responses exercise the real hook rather than a copy.
function hooks() {
  const slots = [];
  let index = 0;
  let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const slot = slots[index++] ?? (slots[index - 1] = { value: initial });
      return [slot.value, next => { slot.value = typeof next === 'function' ? next(slot.value) : next; }];
    },
    useRef(initial) {
      return slots[index++] ?? (slots[index - 1] = { current: initial });
    },
    useCallback(callback, deps) {
      const slot = slots[index++] ?? (slots[index - 1] = {});
      if (!same(slot.deps, deps)) Object.assign(slot, { callback, deps });
      return slot.callback;
    },
    useEffect(effect, deps) {
      const slot = slots[index++] ?? (slots[index - 1] = {});
      if (!same(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
      }
    },
  };
  return {
    react,
    render(fn) { index = 0; return fn(); },
    flush() { const pending = effects; effects = []; pending.forEach(effect => effect()); },
    dispose() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

const rows = (start, count) => Array.from({ length: count }, (_, index) => ({
  id: String(start + index), description: `Activity ${start + index}`, category: 'GENERAL', by: 'Admin', createdAt: '2026-10-11T10:00:00+08:00',
}));
const page = (number, lastPage, items = rows((number - 1) * 10, 10)) => ({ page: number, lastPage, items, total: 25 });
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function dashboard(service) {
  const runner = hooks(), requests = [], activityRequests = [];
  const { useDashboardData } = load('app/(admin)/admin-dashboard/data/dashboard-data.ts', runner.react,
    params => { activityRequests.push(params); return service(params); }, {
      fetch: async url => {
        requests.push(url);
        return { ok: true, json: async () => ({ data: url.includes('analytics') ? { daily_series: [], fleet: { active_vehicles: 2 } } : { data: [] } }) };
      },
    });
  const read = () => runner.render(useDashboardData);
  read();
  runner.flush();
  return { read, runner, requests, activityRequests };
}

test('loads today in pages of ten, blocks overlapping calls, deduplicates and stops at the final page', async () => {
  const second = deferred();
  const feed = dashboard(async ({ page: number }) => number === 1 ? page(1, 3) : number === 2 ? second.promise : page(3, 3, rows(19, 6)));
  await settle();
  assert.equal(feed.read().data.recentActivityLogs.length, 10);
  assert.equal(feed.requests.length, 5);
  const pending = feed.read().activityFeed.loadMore();
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.activityRequests.length, 2);
  second.resolve(page(2, 3, [...rows(9, 11), ...rows(10, 1)]));
  await pending;
  assert.equal(feed.read().data.recentActivityLogs.length, 20);
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.read().data.recentActivityLogs.length, 25);
  assert.equal(feed.read().activityFeed.hasMore, false);
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.activityRequests.length, 3);
  assert.deepEqual(feed.activityRequests.map(params => ({ dateRange: params.dateRange, page: params.page, perPage: params.perPage })), [1, 2, 3].map(number => ({ dateRange: 'today', page: number, perPage: 10 })));
});

test('failed later pages retain entries and retry the same page without reloading other cards', async () => {
  let fail = true;
  const feed = dashboard(async ({ page: number }) => {
    if (number === 2 && fail) throw new Error('Network unavailable');
    return page(number, 2);
  });
  await settle();
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.read().data.recentActivityLogs.length, 10);
  assert.ok(feed.read().activityFeed.error);
  assert.equal(feed.read().activityFeed.isLoading, false);
  fail = false;
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.read().data.recentActivityLogs.length, 20);
  assert.equal(feed.read().activityFeed.error, null);
  assert.deepEqual(feed.activityRequests.map(params => params.page), [1, 2, 2]);
  assert.equal(feed.requests.length, 5);
});

test('a failed or empty first page keeps the dashboard usable and supports an isolated retry', async () => {
  let fail = true;
  const feed = dashboard(async () => { if (fail) throw new Error('Offline'); return page(1, 1, []); });
  await settle();
  assert.equal(feed.read().error, null);
  assert.equal(feed.read().data.recentActivityLogs.length, 0);
  assert.ok(feed.read().activityFeed.error);
  fail = false;
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.read().activityFeed.error, null);
  assert.equal(feed.read().activityFeed.hasMore, false);
  await feed.read().activityFeed.loadMore();
  assert.equal(feed.activityRequests.length, 2);
  assert.equal(feed.requests.length, 5);
});

test('refresh and unmount cancel activity requests and ignore their late results', async () => {
  const late = deferred();
  let refreshed = false;
  const feed = dashboard(async ({ page: number }) => number === 2 ? late.promise : page(1, refreshed ? 1 : 2, refreshed ? rows(99, 1) : rows(0, 10)));
  await settle();
  const old = feed.read().activityFeed.loadMore();
  refreshed = true;
  await feed.read().refetch();
  assert.equal(feed.activityRequests[1].signal.aborted, true);
  late.resolve(page(2, 2));
  await old;
  assert.deepEqual(Array.from(feed.read().data.recentActivityLogs, log => log.id), ['99']);

  const delayed = deferred();
  const mounted = dashboard(async ({ page: number }) => number === 1 ? page(1, 2) : delayed.promise);
  await settle();
  const request = mounted.read().activityFeed.loadMore();
  mounted.runner.dispose();
  assert.equal(mounted.activityRequests[1].signal.aborted, true);
  delayed.resolve(page(2, 2));
  await request;
  assert.equal(mounted.read().data.recentActivityLogs.length, 10);
});

function find(element, match) {
  if (!element || typeof element !== 'object') return null;
  if (match(element)) return element;
  for (const child of React.Children.toArray(element.props?.children)) {
    const result = find(child, match);
    if (result) return result;
  }
  return null;
}

test('timeline loads near the bottom, fills short panes, pauses on errors and provides retry', () => {
  const runner = hooks();
  let calls = 0;
  const props = { activeVehicles: '2', recentVehicles: [], recentLostFound: [], recentUsers: [], recentAnnouncements: [], recentActivityLogs: rows(0, 10), activityFeed: { isLoading: false, hasMore: true, error: null, loadMore: async () => { calls++; } } };
  const { DashboardPreviewCards } = load('components/admin/dashboard/dashboard-preview-cards.tsx', runner.react, null, { ResizeObserver: class { observe() {} disconnect() {} } });
  const pane = { scrollHeight: 900, clientHeight: 200, scrollTop: 0 };
  const read = () => {
    const tree = runner.render(() => DashboardPreviewCards(props));
    const timeline = find(tree, element => element.props?.['aria-label'] === 'Recent activity timeline');
    timeline.props.ref.current = pane;
    runner.flush();
    return { tree, timeline };
  };
  let rendered = read();
  const timestamp = find(rendered.tree, element => element.type === 'time');
  assert.equal(timestamp.props.dateTime, props.recentActivityLogs[0].createdAt);
  assert.equal(timestamp.props.children, '10:00 AM');
  assert.match(timestamp.props.title, /Philippine time/);
  rendered.timeline.props.onScroll({ currentTarget: pane });
  assert.equal(calls, 0);
  pane.scrollTop = 680;
  rendered.timeline.props.onScroll({ currentTarget: pane });
  assert.equal(calls, 1);
  props.activityFeed = { ...props.activityFeed, isLoading: true };
  rendered = read();
  rendered.timeline.props.onScroll({ currentTarget: pane });
  assert.equal(calls, 1);
  props.activityFeed = { ...props.activityFeed, isLoading: false, error: 'Failed' };
  rendered = read();
  rendered.timeline.props.onScroll({ currentTarget: pane });
  assert.equal(calls, 1);
  find(rendered.tree, element => element.type === 'button').props.onClick();
  assert.equal(calls, 2);
  pane.scrollHeight = 150;
  props.activityFeed = { ...props.activityFeed, error: null };
  read();
  assert.equal(calls, 3);
  props.activityFeed = { ...props.activityFeed, hasMore: false };
  rendered = read();
  rendered.timeline.props.onScroll({ currentTarget: pane });
  assert.equal(calls, 3);
});
