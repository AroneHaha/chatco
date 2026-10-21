/* eslint-disable @typescript-eslint/no-require-imports -- Node tests load transpiled TypeScript through CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');

const root = path.resolve(__dirname, '..');
function load(relative, options = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  cache.set(relative, exports);
  vm.runInNewContext(compiled, {
    exports, process, AbortSignal, URL, URLSearchParams, window: options.window,
    localStorage: { removeItem() {} },
    fetch: options.fetch ?? (() => { throw new Error('Unexpected fetch'); }),
    require(name) {
      if (name === 'react') return options.react ?? React;
      if (name === '@/types') return load('types/user.ts', options, cache);
      if (name === '@/lib/auth/server/client-ip') return { clientIpHeaders: () => ({}) };
      if (name === '@/lib/conductor/server/mappers') return { mapShiftLog: shift => shift };
      if (name.includes('/persistence/')) return {
        getConductorDeviceId: () => 'test-web-device-123', CONDUCTOR_DEVICE_TYPE: 'WEB',
        cacheShift() {}, clearShift() {},
      };
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`, options, cache);
      return require(name);
    },
  }, { filename: relative });
  return exports;
}
function request(url, token, role) {
  const cookie = [token && `chatco_session=${token}`, role && `chatco_role=${role}`].filter(Boolean).join('; ');
  return new NextRequest(`http://localhost:3000${url}`, { headers: { cookie } });
}
const json = (data, status = 200) => Response.json(data, { status });
const dashboards = { ADMIN: '/admin-dashboard', CONDUCTOR: '/conductor-dashboard', COMMUTER: '/dashboard' };
function rolePages(group) {
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(file) : entry.name === 'page.tsx' ? [file] : [];
    });
  }
  const directory = path.join(root, 'app', `(${group})`);
  return walk(directory).map(file => `/${path.relative(directory, path.dirname(file)).split(path.sep).join('/')}`);
}

test('every protected page is checked before render and redirects by the verified token role', async () => {
  const calls = [];
  const { middleware, config } = load('middleware.ts', { fetch: async (url, options) => {
    calls.push(url);
    assert.equal(options.cache, 'no-store');
    const role = options.headers.Authorization.slice('Bearer '.length);
    return json({ data: { user: { id: 'verified-user', role } } });
  } });
  for (const [group, requiredRole] of [['admin', 'ADMIN'], ['conductor', 'CONDUCTOR'], ['commuter', 'COMMUTER']]) {
    for (const url of rolePages(group)) {
      assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true, url);
      const anonymous = await middleware(request(url));
      assert.equal(anonymous.status, 307, url);
      assert.equal(anonymous.headers.get('location'), 'http://localhost:3000/login');
      assert.equal(await anonymous.text(), '');
      for (const role of Object.keys(dashboards)) {
        // Supply the requested page's role as a forged cookie, not the real role.
        const response = await middleware(request(url, role, requiredRole));
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        if (role === requiredRole) {
          assert.equal(response.headers.get('x-middleware-next'), '1', url);
        } else {
          assert.equal(response.status, 307, url);
          assert.equal(response.headers.get('location'), `http://localhost:3000${dashboards[role]}`);
          assert.equal(await response.text(), '');
        }
      }
    }
  }
  assert.equal(calls.length, [...rolePages('admin'), ...rolePages('conductor'), ...rolePages('commuter')].length * 3);
});

test('landing/login/signup redirect authenticated users; public pages and APIs keep their existing flow', async () => {
  let calls = 0;
  const { middleware, config } = load('middleware.ts', { fetch: async (_, options) => {
    calls++;
    return json({ data: { user: { id: 'verified-user', role: options.headers.Authorization.slice(7) } } });
  } });
  for (const url of ['/', '/login', '/signup']) {
    const anonymous = await middleware(request(url));
    assert.equal(anonymous.headers.get('x-middleware-next'), '1');
    for (const role of Object.keys(dashboards)) {
      const response = await middleware(request(`${url}?redirect=/monitoring`, role));
      assert.equal(response.headers.get('location'), `http://localhost:3000${dashboards[role]}`);
    }
  }
  for (const url of ['/privacy-policy', '/terms-of-service', '/share/public-token', '/logo-transparent.png']) {
    assert.equal((await middleware(request(url, 'ADMIN'))).headers.get('x-middleware-next'), '1');
  }
  assert.equal(calls, 9);
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/api/admin/analytics' }), false);
});

test('expired/revoked/invalid sessions are cleared without a redirect loop; outages keep the session and deny content', async () => {
  for (const status of [401, 403]) {
    const { middleware } = load('middleware.ts', { fetch: async () => json({}, status) });
    for (const url of ['/', '/login', '/monitoring']) {
      const response = await middleware(request(url, 'rejected-token', 'ADMIN'));
      assert.equal(response.cookies.get('chatco_session').value, '');
      assert.equal(response.cookies.get('chatco_role').value, '');
      assert.equal(response.headers.get('location'), url === '/monitoring' ? 'http://localhost:3000/login' : null);
    }
  }
  for (const failure of [async () => json({}, 500), async () => json({}, 429), async () => { throw new Error('Timeout'); }]) {
    const { middleware } = load('middleware.ts', { fetch: failure });
    const response = await middleware(request('/monitoring', 'valid-token', 'ADMIN'));
    assert.equal(response.status, 503);
    assert.equal(response.cookies.getAll().length, 0);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-middleware-next'), null);
    assert.doesNotMatch(await response.text(), /monitoring|admin/i);
  }
  const { middleware } = load('middleware.ts', { fetch: async () => json({ data: { user: { id: 'user', role: 'UNKNOWN' } } }) });
  assert.equal((await middleware(request('/dashboard', 'token'))).headers.get('location'), 'http://localhost:3000/login');
});

test('encoded, nested and RSC/prefetch URLs cannot bypass the page guard', async () => {
  const { middleware, config } = load('middleware.ts');
  for (const url of ['/settings/fare-matrix?embed=1', '/%6donitoring', '/conductor-dashboard/metrics', '/gcash/return?_rsc=test']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url, headers: { rsc: '1', 'next-router-prefetch': '1' } }), true);
    const response = await middleware(request(url));
    assert.equal(response.headers.get('location'), 'http://localhost:3000/login');
    assert.equal(await response.text(), '');
  }
});

test('successful login issues the existing session and redirects every role to its landing page', async () => {
  for (const role of Object.keys(dashboards)) {
    for (const activeShift of role === 'CONDUCTOR' ? [null, { shift_id: 'active-shift' }] : [null]) {
      const { POST } = load('app/api/auth/login/route.ts', { fetch: async url =>
        url.endsWith('/conductor/shift') ? json({ data: activeShift }) : json({ data: { id: 'user', role, email: 'user@test.invalid', name: 'User', token: 'sanctum-token' } }),
      });
      const response = await POST(new Request('http://localhost:3000/api/auth/login?redirect=/monitoring', {
        method: 'POST', body: JSON.stringify({ email: 'user@test.invalid', password: 'password123' }),
      }));
      const body = await response.json();
      assert.equal(response.status, 200);
      // A conductor without an active shift starts at unit verification.
      const expectedPath = role === 'CONDUCTOR' && !activeShift ? '/unit-verification' : dashboards[role];
      assert.equal(body.redirectPath, expectedPath);
      assert.equal(response.cookies.get('chatco_session').value, 'sanctum-token');
      assert.equal(response.cookies.get('chatco_session').httpOnly, true);
      if (role === 'CONDUCTOR') assert.deepEqual(body.activeShift, activeShift);
    }
  }
});

test('maintenance login keeps its notice and issues no session cookie', async () => {
  const { POST } = load('app/api/auth/login/route.ts', { fetch: async () => json({
    success: false, code: 'MAINTENANCE', message: 'Commuter service is being updated.', data: null,
  }, 503) });
  const response = await POST(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email: 'user@test.invalid', password: 'password123' }),
  }));
  assert.equal(response.status, 503);
  assert.equal(response.cookies.getAll().length, 0);
  assert.deepEqual(await response.json(), { code: 'MAINTENANCE', message: 'Commuter service is being updated.' });
});

test('client guards mount no protected content while loading or for another role', () => {
  for (const requiredRole of Object.keys(dashboards)) {
    for (const userRole of [null, ...Object.keys(dashboards)]) {
      for (const isLoading of [true, false]) {
        const redirects = [];
        const effects = [];
        let mounts = 0;
        const { RequireRole } = load('contexts/auth-context.tsx', {
          react: { ...React, useContext: () => ({ user: userRole ? { role: userRole } : null, isLoading }), useEffect: effect => effects.push(effect) },
          window: { location: { replace: url => redirects.push(url) } },
        });
        const content = RequireRole({ role: requiredRole, children: React.createElement(() => { mounts++; return React.createElement('div', null, 'Protected content'); }) });
        const html = renderToStaticMarkup(content);
        const allowed = !isLoading && userRole === requiredRole;
        assert.equal(mounts, allowed ? 1 : 0);
        assert.equal(html, allowed ? '<div>Protected content</div>' : '');
        effects.forEach(effect => effect());
        assert.deepEqual(redirects, !isLoading && !allowed ? [dashboards[userRole] ?? '/login'] : []);
      }
    }
  }
});

test('an older auth check cannot overwrite a successful login', async () => {
  const slots = [];
  let slot = 0;
  let finishRefresh;
  const pendingRefresh = new Promise(resolve => { finishRefresh = resolve; });
  const { AuthProvider } = load('contexts/auth-context.tsx', {
    react: { ...React,
      useState: initial => { const i = slot++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
      useRef: initial => { const i = slot++; return slots[i] ?? (slots[i] = { current: initial }); },
      useCallback: callback => callback, useEffect() {},
    },
    fetch: async url => url === '/api/auth/me' ? pendingRefresh : json({ user: { id: 'admin', role: 'ADMIN', email: 'admin@test.invalid' }, redirectPath: '/admin-dashboard' }),
  });
  const render = () => { slot = 0; return AuthProvider({ children: null }).props.value; };
  const auth = render();
  const refresh = auth.refresh();
  await auth.login('admin@test.invalid', 'password123');
  finishRefresh(json({}, 401));
  await refresh;
  assert.equal(render().user.role, 'ADMIN');
  assert.equal(render().isLoading, false);
});
