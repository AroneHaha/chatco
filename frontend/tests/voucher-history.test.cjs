/* eslint-disable @typescript-eslint/no-require-imports -- Node tests exercise the existing client page without a browser dependency. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const rows = (start, count) => Array.from({ length: count }, (_, index) => ({
  id: String(start + index), code: `CHATCO-${start + index}`, type: 'FREE_RIDE', status: 'AVAILABLE',
  amount: null, expires_at: null, created_at: '2026-10-13T10:00:00+08:00', commuter_id: 'commuter',
}));
const batch = (items, nextCursor) => ({ ok: true, json: async () => ({ data: { data: items, next_cursor: nextCursor } }) });

// Preserve hook identity and effect cleanups across renders. The observer is
// driven explicitly to exercise the page's actual fetch and cancellation logic.
function history(service) {
  const slots = [], observers = [], requests = [];
  let position = 0, effects = [], tree;
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
    useEffect(effect, deps) {
      const slot = slots[position++] ?? (slots[position - 1] = {});
      if (!same(slot.deps, deps)) {
        slot.deps = deps;
        effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
      }
    },
  };
  const root = { resets: 0, scrollTo() { this.resets++; } }, sentinel = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/(admin)/settings/voucher-generator/page.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, AbortController, URLSearchParams, crypto: require('node:crypto').webcrypto,
    setInterval: () => 1, clearInterval() {}, setTimeout() {},
    fetch: (url, options) => { requests.push({ url, signal: options.signal, method: options.method, body: options.body }); return service(url, options); },
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; this.active = true; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.active = false; }
      trigger() { if (this.active) this.callback([{ isIntersecting: true }]); }
    },
    require(name) {
      if (name === 'react') return { ...React, ...react };
      if (name === '@/components/admin/ui/settings-section') return { SettingsSection: props => props.children };
      if (name === '@/components/admin/ui/modal') return { Modal: props => props.children };
      return require(name);
    },
  });
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    return [value, ...nodes(value.props?.children)];
  }
  function render() {
    position = 0;
    tree = exports.default();
    for (const node of nodes(tree)) {
      if (node.props?.ref) node.props.ref.current = node.props.role === 'status' ? sentinel : root;
    }
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
  }
  render();
  return {
    render, requests, root,
    ids: () => nodes(tree).filter(node => node.type === 'li').map(node => node.key),
    filter(index, value) { nodes(tree).filter(node => node.type === 'select')[index].props.onChange({ target: { value } }); render(); },
    observer: () => observers.findLast(observer => observer.active),
    retry() { nodes(tree).find(node => node.type === 'button' && node.props.children === 'Retry').props.onClick(); },
    dialog: () => nodes(tree).find(node => node.props?.isOpen),
    openDelete(id) { nodes(tree).find(node => node.props?.['aria-label'] === `Delete CHATCO-${id}`).props.onClick(); render(); },
    cancelDelete() { nodes(tree).find(node => node.type === 'button' && node.props.children === 'Cancel').props.onClick(); render(); },
    confirmDelete() { nodes(tree).find(node => node.type === 'button' && node.props.children?.includes?.('Delete Voucher')).props.onClick(); },
    submitGeneration() { nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); render(); },
    confirmGeneration() { nodes(nodes(tree).find(node => node.props?.isOpen)).find(node => node.type === 'button' && node.props.children?.includes?.('Generate & Distribute')).props.onClick(); },
    changeGenerationType(label) { nodes(tree).find(node => node.props?.role === 'radio' && nodes(node).some(child => child.props?.children === label)).props.onClick(); render(); },
    changeGenerationNumber(label, value) {
      const field = nodes(tree).find(node => node.type === 'label' && nodes(node).some(child => child.props?.children === label));
      nodes(field).find(node => node.type === 'input').props.onChange({ target: { value } });
      render();
    },
    enableTimeLimit() {
      const field = nodes(tree).find(node => node.type === 'label' && node.props.children?.includes?.('Set a time limit'));
      nodes(field).find(node => node.type === 'input').props.onChange({ target: { checked: true } });
      render();
    },
    dispose() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

test('loads ten newest vouchers, appends on scroll, blocks duplicate requests, and stops at the end', async () => {
  const second = deferred();
  const feed = history(url => {
    const cursor = new URL(url, 'http://localhost').searchParams.get('cursor');
    return cursor === 'second' ? second.promise : Promise.resolve(cursor === 'third' ? batch(rows(20, 5), null) : batch(rows(0, 10), 'second'));
  });
  await settle();
  feed.render();
  assert.equal(feed.ids().length, 10);
  const query = new URL(feed.requests[0].url, 'http://localhost').searchParams;
  assert.equal(query.get('per_page'), '10');
  assert.equal(query.get('date_range'), 'last_7_days');
  assert.equal(query.get('pagination'), 'cursor');
  assert.equal(query.has('type'), false);
  assert.equal(feed.observer().options.root, feed.root);
  const observer = feed.observer();
  observer.trigger();
  observer.trigger();
  assert.equal(feed.requests.length, 2);
  second.resolve(batch([...rows(9, 1), ...rows(10, 10)], 'third'));
  await settle();
  feed.render();
  assert.equal(feed.ids().length, 20);
  feed.observer().trigger();
  await settle();
  feed.render();
  assert.equal(feed.ids().length, 25);
  assert.equal(new Set(feed.ids()).size, 25);
  assert.equal(feed.observer(), undefined);
  assert.equal(feed.requests.length, 3);
  feed.dispose();
});

test('voucher deletion requires modal confirmation, allows cancellation, and blocks repeat requests', async () => {
  const deletion = deferred();
  const feed = history(async (url, options) => options.method === 'DELETE' ? deletion.promise : batch(rows(0, 10), null));
  await settle();
  feed.render();
  feed.openDelete('0');
  assert.ok(feed.dialog());
  assert.equal(feed.requests.length, 1);
  feed.cancelDelete();
  assert.equal(feed.dialog(), undefined);
  assert.equal(feed.ids().length, 10);
  assert.equal(feed.requests.length, 1);

  feed.openDelete('0');
  feed.confirmDelete();
  feed.confirmDelete();
  assert.equal(feed.requests.length, 2);
  assert.equal(feed.requests[1].method, 'DELETE');
  assert.equal(feed.requests[1].url, '/api/admin/vouchers/0');
  feed.cancelDelete();
  assert.ok(feed.dialog());
  deletion.resolve({ ok: true });
  await settle();
  feed.render();
  assert.equal(feed.dialog(), undefined);
  assert.equal(feed.ids().length, 9);
  assert.equal(feed.ids().includes('0'), false);
  feed.dispose();
});

test('failed deletion keeps the voucher and confirmation open for a retry', async () => {
  let fail = true;
  const feed = history(async (url, options) => options.method === 'DELETE' ? { ok: !fail } : batch(rows(0, 10), null));
  await settle();
  feed.render();
  feed.openDelete('0');
  feed.confirmDelete();
  await settle();
  feed.render();
  assert.ok(feed.dialog());
  assert.equal(feed.ids().length, 10);
  fail = false;
  feed.confirmDelete();
  await settle();
  feed.render();
  assert.equal(feed.dialog(), undefined);
  assert.equal(feed.ids().length, 9);
  assert.equal(feed.requests.length, 3);
  feed.dispose();
});

test('generation previews the batch, supports cancellation, and requires confirmation before one POST', async () => {
  const generation = deferred();
  const feed = history(async (url, options) => options.method === 'POST' ? generation.promise : batch(rows(0, 10), null));
  await settle();
  feed.render();
  feed.changeGenerationNumber('Quantity', '10');
  feed.submitGeneration();
  assert.ok(feed.dialog());
  assert.equal(feed.requests.length, 1);
  feed.cancelDelete(); // Both confirmation modals use the same Cancel action.
  assert.equal(feed.dialog(), undefined);
  assert.equal(feed.requests.length, 1);
  feed.submitGeneration();
  feed.confirmGeneration();
  feed.confirmGeneration();
  assert.equal(feed.requests.length, 2);
  const payload = JSON.parse(feed.requests[1].body);
  assert.equal(payload.type, 'FREE_RIDE');
  assert.equal(payload.quantity, 10);
  assert.equal(payload.amount, null);
  assert.equal(payload.validity_hours, null);
  assert.equal(payload.allow_duplicates, false);
  feed.cancelDelete();
  assert.ok(feed.dialog());
  generation.resolve({ ok: true, json: async () => ({ data: rows(10, 10) }) });
  await settle();
  feed.render();
  await settle();
  feed.render();
  assert.equal(feed.dialog(), undefined);
  assert.equal(feed.requests.filter(request => request.method === 'POST').length, 1);
  assert.equal(feed.requests.length, 3); // Refresh history after distribution.
  feed.dispose();
});

test('failed generation retains the reviewed discount and expiry details and reuses its request key', async () => {
  let fail = true;
  const feed = history(async (url, options) => {
    if (options.method !== 'POST') return batch(rows(0, 10), null);
    if (fail) throw new Error('Network interrupted');
    return { ok: true, json: async () => ({ data: rows(10, 5) }) };
  });
  await settle();
  feed.render();
  feed.changeGenerationType('Discount');
  feed.changeGenerationNumber('Discount amount', '5.25');
  feed.enableTimeLimit();
  feed.changeGenerationNumber('Valid for (hours)', '48');
  feed.submitGeneration();
  // Even if an underlying form changes, the confirmed snapshot stays fixed.
  feed.changeGenerationNumber('Discount amount', '8');
  feed.confirmGeneration();
  await settle();
  feed.render();
  assert.ok(feed.dialog());
  const first = JSON.parse(feed.requests[1].body);
  assert.equal(first.type, 'DISCOUNT');
  assert.equal(first.amount, 5.25);
  assert.equal(first.validity_hours, 48);
  fail = false;
  feed.confirmGeneration();
  await settle();
  feed.render();
  assert.equal(feed.dialog(), undefined);
  const posts = feed.requests.filter(request => request.method === 'POST');
  assert.equal(posts.length, 2);
  assert.equal(posts[0].body, posts[1].body);
  feed.dispose();
});

test('failed later batches preserve loaded entries and retry the same cursor', async () => {
  let fail = true;
  const feed = history(async url => {
    if (new URL(url, 'http://localhost').searchParams.has('cursor')) {
      if (fail) throw new Error('Network interrupted');
      return batch(rows(10, 3), null);
    }
    return batch(rows(0, 10), 'second');
  });
  await settle();
  feed.render();
  feed.observer().trigger();
  await settle();
  feed.render();
  assert.equal(feed.ids().length, 10);
  assert.equal(feed.observer(), undefined);
  fail = false;
  feed.retry();
  await settle();
  feed.render();
  assert.equal(feed.ids().length, 13);
  assert.equal(feed.requests[1].url, feed.requests[2].url);
  assert.equal(feed.observer(), undefined);
  feed.dispose();
});

test('filter changes restart at ten and cancel pending loads without mixing stale results', async () => {
  const stale = deferred();
  const feed = history(async url => {
    const query = new URL(url, 'http://localhost').searchParams;
    if (query.has('cursor')) return stale.promise;
    return query.get('type') === 'DISCOUNT' ? batch(rows(100, 10), null) : batch(rows(0, 10), 'second');
  });
  await settle();
  feed.render();
  feed.observer().trigger();
  feed.filter(0, 'DISCOUNT');
  assert.equal(feed.requests[1].signal.aborted, true);
  feed.filter(1, 'this_month');
  assert.equal(feed.requests[2].signal.aborted, true);
  await settle();
  feed.render();
  stale.resolve(batch(rows(10, 10), 'third'));
  await settle();
  feed.render();
  assert.deepEqual(feed.ids(), rows(100, 10).map(row => row.id));
  const query = new URL(feed.requests.at(-1).url, 'http://localhost').searchParams;
  assert.equal(query.get('date_range'), 'this_month');
  assert.equal(query.get('type'), 'DISCOUNT');
  assert.equal(query.get('per_page'), '10');
  assert.equal(query.has('cursor'), false);
  assert.equal(feed.root.resets, 3);
  assert.equal(feed.observer(), undefined);
  feed.dispose();
});
