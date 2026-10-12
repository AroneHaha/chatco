/* eslint-disable @typescript-eslint/no-require-imports -- Node tests run the existing notifications provider without browser dependencies. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const settle = () => new Promise(resolve => setImmediate(resolve));
const notice = id => ({ id, type: 'voucher_received', title: 'Voucher received', message: 'You received a free-ride voucher.', createdAt: '2026-10-13T10:00:00+08:00', isRead: false });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function updates(service) {
  const slots = [], reads = [], requests = [];
  let position = 0, effects = [], poll, count = 0, rewardRefreshes = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const slot = slots[position++] ?? (slots[position - 1] = { value: typeof initial === 'function' ? initial() : initial });
      return [slot.value, next => { slot.value = typeof next === 'function' ? next(slot.value) : next; }];
    },
    useRef(initial) { return slots[position++] ?? (slots[position - 1] = { current: initial }); },
    useCallback(callback, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) Object.assign(slot, { callback, deps });
      return slot.callback;
    },
    useMemo(create, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) Object.assign(slot, { value: create(), deps });
      return slot.value;
    },
    useEffect(effect, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
      }
    },
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../contexts/announcements-context.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, setInterval: callback => { poll = callback; return 1; }, clearInterval() {},
    require(name) {
      if (name === 'react') return { ...React, ...react };
      if (name === '@/contexts/auth-context') return { useAuth: () => ({ isAuthenticated: true, isLoading: false }) };
      if (name === '@/lib/echo') return { getEcho: () => ({ channel: () => ({ listen() {}, stopListening() {} }) }) };
      if (name === '@/lib/commuter/rewards-events') return { notifyRewardsChanged: () => { rewardRefreshes++; } };
      if (name === '@/lib/shared/services/announcement.service') return {
        list: async params => { requests.push(params); return service(); },
        unreadCount: async params => params?.types ? 0 : count,
        markRead: async id => { reads.push(id); },
        markAllRead: async () => 0,
        AnnouncementOperationError: class extends Error {},
      };
      return require(name);
    },
  });
  function value() {
    position = 0;
    const result = exports.AnnouncementsProvider({ children: null }).props.value;
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return result;
  }
  value();
  return {
    value, reads, requests,
    poll: () => poll(),
    setCount: next => { count = next; },
    refreshes: () => rewardRefreshes,
    dispose: () => slots.forEach(slot => slot.cleanup?.()),
  };
}

test('voucher notices use the Voucher category and refresh rewards once per newly received notice', async () => {
  let items = [];
  const feed = updates(async () => ({ items }));
  await settle();
  items = [notice('first')];
  await feed.value().refresh();
  assert.equal(feed.value().announcements[0].type, 'VOUCHER');
  assert.equal(feed.refreshes(), 1);
  await feed.value().refresh();
  assert.equal(feed.refreshes(), 1);
  items = [notice('second'), notice('first')];
  await feed.value().refresh();
  assert.equal(feed.refreshes(), 2);
  assert.ok(feed.requests.every(request => request.perPage === 15));
  feed.dispose();
});

test('a slow earlier feed request cannot replace a newly received voucher update', async () => {
  const old = deferred(), latest = deferred();
  let calls = 0;
  const feed = updates(() => ++calls === 1 ? Promise.resolve({ items: [] }) : calls === 2 ? old.promise : latest.promise);
  await settle();
  const earlier = feed.value().refresh();
  const newer = feed.value().refresh();
  latest.resolve({ items: [notice('newest')] });
  await newer;
  old.resolve({ items: [notice('older')] });
  await earlier;
  assert.equal(feed.value().announcements.length, 1);
  assert.equal(feed.value().announcements[0].id, 'newest');
  assert.equal(feed.value().isLoading, false);
  assert.equal(feed.refreshes(), 1);
  feed.dispose();
});

test('the existing unread poll loads voucher notices and keeps mark-as-read tracking intact', async () => {
  let items = [];
  const feed = updates(async () => ({ items }));
  await settle();
  items = [notice('received')];
  feed.setCount(1);
  feed.poll();
  await settle();
  assert.equal(feed.value().unreadCount, 1);
  assert.equal(feed.value().announcements[0].type, 'VOUCHER');
  assert.equal(feed.refreshes(), 1);
  feed.value().markAsRead('received');
  await settle();
  assert.equal(feed.value().unreadCount, 0);
  assert.equal(feed.value().announcements[0].isRead, true);
  assert.deepEqual(feed.reads, ['received']);
  feed.dispose();
});
