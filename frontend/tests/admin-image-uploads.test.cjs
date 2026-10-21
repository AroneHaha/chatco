/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node test harness loads TypeScript directly. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in modules)) throw new Error(`Unexpected import ${id}`);
    return modules[id];
  }, FormData, File, URL, Response, Headers, Date, Error, setTimeout, clearTimeout, process: { env: {} }, ...globals });
  return exports;
}
const responses = {
  jsonData: (data, status = 200) => Response.json({ data }, { status }),
  jsonError: (message, status) => Response.json({ message }, { status }),
  jsonValidationError: (message, errors, status) => Response.json({ message, errors }, { status }),
};
const request = () => ({ cookies: { get: () => ({ value: 'test-only-token' }) }, headers: new Headers({ 'content-type': 'multipart/form-data; boundary=sample' }) });

test('admin photo proxy preserves multipart, authenticates and propagates validation', async () => {
  const calls = [];
  const proxy = load('lib/conductor/server/proxy.ts', { 'next/server': {}, '@/lib/conductor/server/response': responses }, {
    fetch: async (url, options) => { calls.push({ url, ...options }); return Response.json({ errors: { photo: ['Invalid image.'] }, message: 'Invalid.' }, { status: 422 }); },
  });
  const route = load('app/api/admin/account/profile/photo/route.ts', {
    '@/lib/conductor/server/proxy': proxy, '@/lib/conductor/server/response': responses,
  });
  const body = new FormData(); body.set('photo', new File(['image'], 'avatar.jpg', { type: 'image/jpeg' }));
  const req = { ...request(), formData: async () => body };
  const res = await route.POST(req);
  assert.equal(res.status, 422);
  assert.equal((await res.json()).errors.photo[0], 'Invalid image.');
  assert.ok(calls[0].url.endsWith('/api/v1/admin/account/profile/photo'));
  assert.equal(calls[0].body, body);
  assert.equal(calls[0].headers.Authorization, 'Bearer test-only-token');
  assert.equal(calls[0].headers['Content-Type'], undefined);
  assert.equal((await route.POST({ ...req, cookies: { get: () => undefined } })).status, 401);
  assert.equal(calls.length, 1);
});

test('onsite proxy preserves ID file bytes and boundary with a trailing-slash API URL', async () => {
  let sent;
  const route = load('app/api/admin/registrations/route.ts', { '@/lib/conductor/server/response': responses }, {
    process: { env: { API_URL: 'https://backend.example.test/' } },
    fetch: async (url, options) => { sent = { url, ...options }; return Response.json({ data: { id: 'new-user' } }, { status: 201 }); },
  });
  const bytes = new TextEncoder().encode('multipart file content').buffer;
  const response = await route.POST({ ...request(), arrayBuffer: async () => bytes });
  assert.equal(response.status, 201);
  assert.equal(sent.url, 'https://backend.example.test/api/v1/admin/registrations');
  assert.equal(sent.body, bytes);
  assert.equal(sent.headers['Content-Type'], 'multipart/form-data; boundary=sample');
  assert.equal(sent.headers.Authorization, 'Bearer test-only-token');
});

test('admin service accepts only a backend-confirmed saved picture', async () => {
  let sent, confirmed = true;
  const service = load('lib/admin/services/account.service.ts', {
    '@/lib/shared/services/password-change.service': { createPasswordChangeClient: () => ({}) },
    '@/lib/api/client': { api: { postForm: async (url, body) => { sent = { url, body }; return { data: confirmed ? { profile_picture_url: 'https://media.example.test/saved.jpg' } : {} }; } } },
  });
  const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' });
  assert.equal(await service.uploadProfilePhoto(file), 'https://media.example.test/saved.jpg');
  assert.equal(sent.url, '/api/admin/account/profile/photo');
  assert.equal(sent.body.get('photo'), file);
  confirmed = false;
  await assert.rejects(service.uploadProfilePhoto(file), /did not confirm/);
});

function ui(file, name, modules, globals = {}, props) {
  const slots = [], effects = [];
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(callback, deps) { const i = cursor++; if (!slots[i] || !deps || deps.some((v, n) => v !== slots[i].deps[n])) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = callback(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const component = load(file, { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': {}, ...modules }, globals)[name];
  const flatten = n => Array.isArray(n) ? n.flatMap(flatten) : n && typeof n === 'object' && n.props ? [n, ...flatten(n.props.children)] : [];
  return () => { cursor = 0; const tree = flatten(component(props)); while (effects.length) effects.shift()(); return tree; };
}
const pick = file => ({ target: { files: [file], value: 'chosen-file' } });

test('admin Settings uploads once, retains old photo on failure and allows retry', async () => {
  let finish, count = 0;
  const user = { name: 'Admin', email: 'admin@example.test', profilePictureUrl: 'https://media.example.test/old.jpg' };
  const render = ui('app/(admin)/settings/profile-security/page.tsx', 'default', {
    'next/image': { default: 'Image' },
    '@/contexts/auth-context': { useAuth: () => ({ user, updateProfilePicture: url => { user.profilePictureUrl = url; } }) },
    '@/components/admin/layout/admin-identity': { getInitials: () => 'A' },
    '@/components/auth/code-input': { default: 'CodeInput' },
    '@/lib/utils/password-policy': { PASSWORD_RULES: [] },
    '@/lib/admin/services/account.service': { uploadProfilePhoto: () => { count++; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); } },
  });
  await render().find(n => n.type === 'input' && n.props.type === 'file').props.onChange(pick(new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' })));
  const save = () => render().find(n => n.type === 'button' && ['Save picture', 'Saving picture…'].includes(n.props.children)).props.onClick();
  save(); save(); assert.equal(count, 1);
  finish.reject(new Error('Storage unavailable')); await new Promise(resolve => setImmediate(resolve));
  assert.ok(render().some(n => n.props.role === 'alert' && n.props.children === 'Storage unavailable'));
  assert.equal(user.profilePictureUrl, 'https://media.example.test/old.jpg');
  save(); finish.resolve('https://media.example.test/new.jpg'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(user.profilePictureUrl, 'https://media.example.test/new.jpg');
  assert.ok(render().some(n => n.props.role === 'status' && n.props.children === 'Profile picture updated.'));
});

test('onsite picker permits selecting the same file again and guards double submit', async () => {
  let reads = 0, finish, submissions = 0;
  class Reader { readAsDataURL() { reads++; this.result = 'data:image/jpeg;base64,image'; this.onload(); } abort() {} }
  const render = ui('components/admin/users/add-registration-modal.tsx', 'AddRegistrationModal', {
    '@/components/admin/ui/modal': { Modal: 'Modal' }, '@/lib/utils/format': { formatContactNumberInput: v => v },
    '@/components/admin/ui/admin-date-picker': { AdminDatePicker: 'AdminDatePicker' },
    '@/components/Stepper': { StepContentWrapper: 'StepContentWrapper' },
    '@/components/commuter/discount-proof-fields': { useDiscountProof: () => ({ schoolName: '', educationLevel: '', gradeLevel: '', term: '', schoolYear: '' }) },
    '@/lib/shared/services/student-renewal.service': { EDUCATION_LABELS: {}, ENROLLMENT_TERMS: [], HIGH_SCHOOL_GRADES: [] },
  }, { FileReader: Reader }, { isOpen: true, onClose() {}, onSave: () => { submissions++; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); } });
  const file = new File(['jpg'], 'id.jpg', { type: 'image/jpeg' });
  const choose = render().find(n => n.type === 'input' && n.props.type === 'file').props.onChange;
  const event = pick(file); choose(event); assert.equal(event.target.value, ''); choose(pick(file)); assert.equal(reads, 2);
  const submit = () => render().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await submit();
  assert.equal(submissions, 0);
  assert.ok(render().some(n => n.props.children === 'Select a date of birth to continue.'));
  render().find(n => n.type === 'AdminDatePicker').props.onChange('2000-01-01');
  await submit(); // Details -> account/review.
  const pending = submit(); await submit(); assert.equal(submissions, 1);
  finish.reject(new Error('Upload failed')); await pending;
  assert.ok(render().some(n => n.props.children === 'Upload failed'));
  const retry = submit(); assert.equal(submissions, 2); finish.reject(new Error('Retry failed')); await retry;
});
