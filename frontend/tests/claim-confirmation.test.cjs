/* eslint-disable @typescript-eslint/no-require-imports -- Run the actual component with lightweight hook stubs. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const settle = () => new Promise(resolve => setImmediate(resolve));

function claimsModal(linkedAccount = null, save = async () => {}, status = 'Pending') {
  const slots = [], calls = [];
  let position = 0, dirty = false, closed = 0;
  const hooks = {
    useState(initial) {
      const slot = slots[position++] ?? (slots[position - 1] = { value: typeof initial === 'function' ? initial() : initial });
      return [slot.value, next => { slot.value = typeof next === 'function' ? next(slot.value) : next; dirty = true; }];
    },
    useRef(initial) { return slots[position++] ?? (slots[position - 1] = { current: initial }); },
    useEffect() {},
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/admin/lost-found/claims-list-modal.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'react') return { ...React, ...hooks };
      if (name === 'lucide-react') return new Proxy({}, { get: (_, icon) => icon });
      if (name === '@/components/admin/ui/modal') return { Modal: 'Modal' };
      if (name === '@/components/admin/lost-found/approve-claim-modal') return { ApproveClaimModal: 'ApproveClaimModal' };
      if (name.includes('proof-photo-picker')) return { default: 'PhotoPicker' };
      return require(name);
    },
  });
  const props = {
    isOpen: true, itemId: 'item-1', onClose: () => { closed++; }, onRecordManualClaim: async () => {},
    claims: [{ id: 'claim-1', claimantName: 'Test Claimant', claimDate: '2026-10-16', status, linkedAccount }],
    onClaimAction: async (...args) => { calls.push(args); await save(); },
  };
  const render = () => {
    let tree;
    do { dirty = false; position = 0; tree = exports.ClaimsListModal(props); } while (dirty);
    return tree;
  };
  return { render, calls, props, closed: () => closed };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object' || node.props?.inert || (node.type === 'Modal' && !node.props.isOpen)) return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
const label = node => React.Children.toArray(node.props.children).filter(child => typeof child === 'string').join('');
const button = (tree, text) => find(tree, node => node.type === 'button' && label(node) === text);

for (const action of ['Approve', 'Reject']) {
  test(`${action} requires confirmation and Cancel leaves the claim unchanged`, async () => {
    const modal = claimsModal();
    await button(modal.render(), action).props.onClick();
    assert.equal(modal.calls.length, 0);
    button(modal.render(), 'Cancel').props.onClick();
    assert.equal(button(modal.render(), `Confirm ${action.toLowerCase()}`), null);
    assert.equal(modal.calls.length, 0);
    await button(modal.render(), action).props.onClick();
    button(modal.render(), `Confirm ${action.toLowerCase()}`).props.onClick();
    await settle();
    assert.deepEqual(modal.calls, [['item-1', action, 'claim-1']]);
    assert.equal(modal.closed(), 1);
  });
}

test('linked account approval retains the pickup confirmation step and rejection requires confirmation', async () => {
  const modal = claimsModal({ id: 'account-1' });
  await button(modal.render(), 'Approve').props.onClick();
  const pickup = find(modal.render(), node => node.type === 'ApproveClaimModal' && node.props.isOpen);
  assert.ok(pickup);
  assert.equal(modal.calls.length, 0);
  pickup.props.onClose();
  await button(modal.render(), 'Reject').props.onClick();
  assert.ok(button(modal.render(), 'Confirm reject'));
  assert.equal(modal.calls.length, 0);
});

test('confirmation prevents duplicate requests and keeps failed decisions open for retry', async () => {
  let reject;
  const modal = claimsModal(null, () => new Promise((_, fail) => { reject = fail; }));
  await button(modal.render(), 'Reject').props.onClick();
  const confirm = button(modal.render(), 'Confirm reject');
  confirm.props.onClick(); confirm.props.onClick();
  assert.equal(modal.calls.length, 1);
  assert.equal(button(modal.render(), 'Cancel').props.disabled, true);
  reject(new Error('Unable to process claim'));
  await settle();
  assert.ok(find(modal.render(), node => node.props?.role === 'alert'));
  assert.ok(button(modal.render(), 'Confirm reject'));
  assert.equal(modal.closed(), 0);
});

test('changing the selected item clears an unconfirmed decision', async () => {
  const modal = claimsModal();
  await button(modal.render(), 'Reject').props.onClick();
  modal.props.itemId = 'item-2';
  assert.equal(button(modal.render(), 'Confirm reject'), null);
  assert.equal(modal.calls.length, 0);
});

// Approved claims offer Release and Reject; both hand off for good, so both confirm first.
for (const action of ['Release', 'Reject']) {
  test(`${action} on an approved claim requires confirmation`, async () => {
    const modal = claimsModal({ id: 'account-1' }, async () => {}, 'Approved');
    await button(modal.render(), action).props.onClick();
    assert.equal(modal.calls.length, 0);
    button(modal.render(), 'Cancel').props.onClick();
    assert.equal(button(modal.render(), `Confirm ${action.toLowerCase()}`), null);
    assert.equal(modal.calls.length, 0);
    await button(modal.render(), action).props.onClick();
    button(modal.render(), `Confirm ${action.toLowerCase()}`).props.onClick();
    await settle();
    assert.deepEqual(modal.calls, [['item-1', action, 'claim-1']]);
    assert.equal(modal.closed(), 1);
  });
}
