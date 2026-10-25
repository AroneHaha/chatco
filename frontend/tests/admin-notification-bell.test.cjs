/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the real component with the existing lightweight hook harness pattern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const settle = () => new Promise(resolve => setImmediate(resolve));
const notice = id => ({ id, title: `Notice ${id}`, message: 'Status update', type: 'VEHICLE_STATUS_CHANGED', createdAt: new Date().toISOString(), isRead: false });

function bell() {
  const slots = [], events = new EventTarget(), intervals = new Set(), requests = [];
  let position = 0, effects = [], items = [], countCalls = 0, override;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    useState(initial) {
      const slot = slots[position++] ?? (slots[position - 1] = { value: initial });
      return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }];
    },
    useRef(initial) { return slots[position++] ?? (slots[position - 1] = { current: initial }); },
    useId() { return 'bell-test'; },
    useCallback(callback, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) Object.assign(slot, { callback, deps });
      return slot.callback;
    },
    useEffect(effect, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
      }
    },
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/admin/layout/notification-bell.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const setInterval = callback => { intervals.add(callback); return callback; };
  const clearInterval = callback => intervals.delete(callback);
  vm.runInNewContext(source, {
    exports, setInterval, clearInterval,
    window: { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), setInterval, clearInterval },
    document: { addEventListener() {}, removeEventListener() {} },
    require(name) {
      if (name === 'react') return { ...React, ...hooks };
      if (name === 'next/link') return { default: 'a' };
      if (name === 'lucide-react') return new Proxy({}, { get: (_, icon) => icon });
      if (name === '@/components/shared/announcement-detail-modal') return { AnnouncementDetailModal: () => null };
      if (name === '@/lib/admin/notification-events') return { ADMIN_NOTIFICATIONS_CHANGED: 'admin:notifications-changed' };
      if (name === '@/lib/shared/services/announcement.service') return {
        unreadCount: async () => { countCalls++; return items.length; },
        list: async params => {
          requests.push(params);
          if (override) return override(params);
          return { items: items.slice((params.page - 1) * params.perPage, params.page * params.perPage), page: params.page, lastPage: Math.ceil(items.length / params.perPage) };
        },
        markRead: async () => {}, markAllRead: async () => {}, AnnouncementOperationError: class extends Error {},
      };
      return require(name);
    },
  });
  const render = () => {
    position = 0;
    const result = exports.NotificationBell({});
    const pending = effects; effects = []; pending.forEach(effect => effect());
    return result;
  };
  return {
    render, requests,
    setItems(value) { items = value; },
    override(value) { override = value; },
    counts: () => countCalls,
    signal: () => events.dispatchEvent(new Event('admin:notifications-changed')),
    poll: () => [...intervals].forEach(callback => callback()),
    dispose: () => slots.forEach(slot => slot.cleanup?.()),
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
const titles = tree => React.Children.toArray(find(tree, node => node.props?.['aria-label'] === 'Notification updates')?.props.children).map(node => node.key);
async function open(feed) {
  let tree = feed.render();
  await settle();
  tree = feed.render();
  find(tree, node => node.props?.['aria-haspopup'] === 'dialog').props.onClick();
  feed.render(); await settle();
  return feed.render();
}

test('live signals refresh count and an open paginated list without dropping loaded pages or duplicating rows', async () => {
  const feed = bell();
  feed.setItems(Array.from({ length: 25 }, (_, index) => notice(String(index))));
  let tree = await open(feed);
  const scroller = find(tree, node => typeof node.props?.onScroll === 'function');
  scroller.props.ref.current = { scrollHeight: 1000, scrollTop: 950, clientHeight: 100 };
  scroller.props.onScroll(); await settle(); tree = feed.render();
  assert.equal(titles(tree).length, 20);
  const before = feed.counts();
  feed.setItems([notice('new'), ...Array.from({ length: 25 }, (_, index) => notice(String(index)))]);
  feed.signal(); await settle(); tree = feed.render();
  assert.equal(titles(tree).length, 20);
  assert.ok(titles(tree)[0].includes('new'));
  assert.equal(new Set(titles(tree)).size, 20);
  assert.ok(feed.counts() > before);
  feed.dispose();
});

test('polling updates an open list when live delivery is unavailable and background failures retain the list', async () => {
  const feed = bell();
  feed.setItems([notice('old')]);
  await open(feed);
  feed.setItems([notice('new'), notice('old')]);
  feed.poll(); await settle();
  assert.ok(titles(feed.render())[0].includes('new'));
  feed.override(async () => { throw new Error('Offline'); });
  feed.signal(); await settle();
  assert.equal(titles(feed.render()).length, 2);
  feed.dispose();
  const requests = feed.requests.length;
  feed.signal(); await settle();
  assert.equal(feed.requests.length, requests);
});

test('a slow older refresh cannot overwrite a newer live update', async () => {
  const feed = bell();
  feed.setItems([notice('initial')]);
  await open(feed);
  let resolve;
  feed.override(() => new Promise(done => { resolve = done; }));
  feed.signal();
  feed.override(undefined);
  feed.setItems([notice('latest')]);
  feed.signal(); await settle();
  resolve({ items: [notice('stale')], page: 1, lastPage: 1 });
  await settle();
  assert.ok(titles(feed.render())[0].includes('latest'));
  feed.dispose();
});
