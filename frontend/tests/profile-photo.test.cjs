/* eslint-disable @typescript-eslint/no-require-imports -- Node's existing test runner uses CommonJS. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in modules)) throw new Error(`Unexpected module: ${id}`);
    return modules[id];
  }, FormData, File, URL, Response, Headers, process: { env: {} }, ...globals });
  return exports;
}

test('multipart client keeps the browser boundary; ordinary JSON requests remain JSON', async () => {
  const requests = [];
  const { api } = load('lib/api/client.ts', { '@/lib/maintenance': { MAINTENANCE_SUSPECTED_EVENT: 'maintenance-suspected' } }, { fetch: async (url, options) => {
    requests.push({ url, ...options }); return Response.json({ success: true });
  } });
  const body = new FormData(); body.set('photo', new File(['image'], 'photo.jpg', { type: 'image/jpeg' }));
  await api.postForm('/api/commuter/profile/photo', body);
  assert.equal(requests[0].body, body);
  assert.equal(requests[0].headers['Content-Type'], undefined);
  assert.equal(requests[0].credentials, 'include');
  await api.post('/api/example', { value: 1 });
  assert.equal(requests[1].headers['Content-Type'], 'application/json');
  assert.equal(requests[1].body, '{"value":1}');
});

test('commuter proxy authenticates multipart without exposing the bearer token to the browser', async () => {
  const requests = [];
  const proxy = load('lib/commuter/server/proxy.ts', { 'next/server': { NextResponse: Response } }, {
    fetch: async (url, options) => { requests.push({ url, ...options }); return Response.json({ success: true, data: { profile: {} } }); },
  });
  const body = new FormData();
  const response = await proxy.proxyToLaravel({ cookies: { get: () => ({ value: 'test-session' }) } }, '/api/v1/commuter/profile/photo', { method: 'POST', body });
  assert.equal(response.status, 200);
  assert.equal(requests[0].body, body);
  assert.equal(requests[0].headers['Content-Type'], undefined);
  assert.equal(requests[0].headers.Authorization, 'Bearer test-session');
  assert.equal(JSON.stringify(await response.json()).includes('test-session'), false);
  const unauthorized = await proxy.proxyToLaravel({ cookies: { get: () => undefined } }, '/api/v1/commuter/profile/photo', { method: 'POST', body });
  assert.equal(unauthorized.status, 401);
  assert.equal(requests.length, 1);
});

test('photo route forwards original multipart to the web-specific backend route', async () => {
  let call;
  const route = load('app/api/commuter/profile/photo/route.ts', {
    '@/lib/commuter/server/proxy': { API_V1: '/api/v1', proxyToLaravel: (...args) => { call = args; return 'forwarded'; } },
  });
  const body = new FormData();
  const request = { formData: async () => body };
  assert.equal(await route.POST(request), 'forwarded');
  assert.equal(call[1], '/api/v1/commuter/profile/photo');
  assert.equal(call[2].body, body);
});

test('profile service sends only the file and maps authoritative snake_case photo URL', async () => {
  let sent;
  const service = load('lib/commuter/services/profile.service.ts', {
    '@/lib/api/client': { api: { postForm: async (url, body) => {
      sent = { url, body };
      return { data: { user: { id: 'owner', email: 'owner@example.test' }, profile: { profile_image_url: 'https://media.example.test/photo.jpg' } } };
    } }, ApiError: class extends Error {} },
    '@/lib/commuter/endpoints': { COMMUTER_API: { profile: '/api/commuter/profile' } },
    '@/lib/shared/services/password-change.service': { createPasswordChangeClient: () => ({}) },
    '@/lib/utils/compress-image': { compressImage: async file => file, IMAGE_COMPRESSION: { profile: {} } },
  });
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const result = await service.uploadProfilePhoto(file);
  assert.equal(sent.url, '/api/commuter/profile/photo');
  assert.equal(sent.body.get('photo'), file);
  assert.equal([...sent.body.keys()].join(','), 'photo');
  assert.equal(result.profileImageUrl, 'https://media.example.test/photo.jpg');
});

function photoUI(upload = async () => ({ profileImageUrl: 'https://media.example.test/new.jpg' })) {
  const states = [], refs = [], cleanups = [], uploaded = [];
  let cursor = 0, refCursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ?? (refs[i] = { current: initial }); },
    useEffect(callback) { if (!cleanups.length) cleanups.push(callback()); },
  };
  const jsx = (type, props) => ({ type, props });
  const { default: Photo } = load('components/commuter/profile/profile-photo.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': { Camera: 'Camera' },
    '@/lib/api/client': { ApiError: class extends Error {} },
    '@/lib/commuter/services/profile.service': { uploadProfilePhoto: upload },
    './profile-photo-cropper': { default: 'Cropper' },
    '@/components/admin/ui/user-avatar': { UserAvatar: 'UserAvatar' },
  });
  const profile = { firstName: 'Real', surname: 'User', profileImageUrl: 'https://media.example.test/old.jpg' };
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' && node.props ? [node, ...flatten(node.props.children)] : [];
  const render = () => { cursor = 0; refCursor = 0; return flatten(Photo({ profile, className: 'avatar', onUploaded: value => uploaded.push(value) })); };
  render();
  return { render, uploaded, profile, unmount: () => cleanups.forEach(fn => fn?.()) };
}
const event = file => ({ target: { files: file ? [file] : [], value: 'selected' } });

test('web photo control blocks duplicate submissions and uses successful backend result', async () => {
  let finish, count = 0;
  const ui = photoUI(() => { count++; return new Promise(resolve => { finish = resolve; }); });
  const choose = ui.render().find(n => n.type === 'input').props.onChange;
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  choose(event(file));
  assert.equal(count, 0); // Selecting a file must not skip crop confirmation.
  const confirm = ui.render().find(n => n.type === 'Cropper').props.onConfirm;
  confirm(file); confirm(file);
  await choose(event(file));
  assert.equal(count, 1);
  finish({ profileImageUrl: 'https://media.example.test/new.jpg' }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.uploaded[0].profileImageUrl, 'https://media.example.test/new.jpg');
  assert.equal(ui.render().find(n => n.type === 'button').props.disabled, false);
});

test('invalid or oversized web photo never sends an upload', async () => {
  let count = 0;
  const ui = photoUI(async () => { count++; });
  const choose = ui.render().find(n => n.type === 'input').props.onChange;
  await choose(event(new File(['pdf'], 'proof.pdf', { type: 'application/pdf' })));
  await choose(event(new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })));
  assert.equal(count, 0);
  assert.ok(ui.render().some(n => n.props.role === 'alert'));
});

test('failed web upload keeps the old image and supports retry', async () => {
  const ui = photoUI(async () => { throw new Error('Offline'); });
  await ui.render().find(n => n.type === 'input').props.onChange(event(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })));
  ui.render().find(n => n.type === 'Cropper').props.onConfirm(new File(['crop'], 'crop.jpg', { type: 'image/jpeg' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.uploaded.length, 0);
  assert.equal(ui.render().find(n => n.type === 'UserAvatar').props.src, ui.profile.profileImageUrl);
  assert.equal(ui.render().find(n => n.type === 'button').props.disabled, false);
});

function avatarUI(props) {
  const states = [];
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
  };
  const jsx = (type, p) => ({ type, props: p });
  const { UserAvatar } = load('components/admin/ui/user-avatar.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/image': 'Image', 'lucide-react': { UserRound: 'UserRound' },
  });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' && node.props ? [node, ...flatten(node.props.children)] : [];
  return () => { cursor = 0; return flatten(UserAvatar(props)); };
}

test('avatar shows the default until a photo exists, and falls back if the photo fails', () => {
  const noPhoto = avatarUI({ src: null, alt: '', fallback: { type: 'span', props: { children: 'RU' } } });
  assert.equal(noPhoto().some(n => n.type === 'img' || n.type === 'Image'), false);
  assert.ok(noPhoto().some(n => n.props.children === 'RU'));

  const render = avatarUI({ src: 'https://media.example.test/photo.jpg', alt: 'Your profile photo', fallback: { type: 'span', props: { children: 'RU' } } });
  const photo = render().find(n => n.type === 'img');
  assert.equal(photo.props.src, 'https://media.example.test/photo.jpg');
  photo.props.onError();
  assert.equal(render().some(n => n.type === 'img'), false);
  assert.ok(render().some(n => n.props.children === 'RU'));
});

test('web photo result cannot update an unmounted profile', async () => {
  let finish;
  const ui = photoUI(() => new Promise(resolve => { finish = resolve; }));
  ui.render().find(n => n.type === 'input').props.onChange(event(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })));
  ui.render().find(n => n.type === 'Cropper').props.onConfirm(new File(['crop'], 'crop.jpg', { type: 'image/jpeg' }));
  ui.unmount(); finish({ profileImageUrl: 'https://media.example.test/new.jpg' }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.uploaded.length, 0);
});

test('cancelling photo crop retains the saved image and sends no upload', () => {
  let count = 0;
  const ui = photoUI(async () => { count++; });
  ui.render().find(n => n.type === 'input').props.onChange(event(new File(['image'], 'photo.jpg', { type: 'image/jpeg' })));
  ui.render().find(n => n.type === 'Cropper').props.onCancel();
  assert.equal(ui.render().some(n => n.type === 'Cropper'), false);
  assert.equal(count, 0);
  assert.equal(ui.render().find(n => n.type === 'UserAvatar').props.src, ui.profile.profileImageUrl);
});
