import assert from 'node:assert/strict';
import { test, beforeEach, after } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
import net from 'node:net';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db = new PGlite();
const env = { JWT_SECRET: 'test-only-key' };
let queries, bcryptCalls, emailCalls, googleCalls, storeBroken;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, process: { env }, console: { error() {} }, TextEncoder, Date,
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: Response.json } };
      if (name === 'node:crypto') return { ...crypto, randomInt: () => 0 };
      if (name === 'crypto') return { default: crypto };
      if (name === 'node:net') return net;
      if (name === '@/lib/db') return { pool: { query(sql, args) {
        queries.push({ sql, args });
        if (storeBroken && sql.includes('auth_rate_limits')) throw Error('unavailable');
        return db.query(sql, args);
      } } };
      if (name === '@/lib/auth-server') return {
        verifyPassword: async (password, hash) => { bcryptCalls++; return hash === 'hash' && password === 'correct-password'; },
        signToken: () => 'issued-token', hashPassword: async () => 'hash',
      };
      if (name === 'bcrypt') return { default: { hash: async () => 'hash' } };
      if (name === '@/lib/require-user') return { requireUser: async () => ({ userId: 1 }) };
      if (name === '@/lib/email') return Object.fromEntries(['sendPasswordResetEmail', 'sendVerificationEmail', 'sendWelcomeEmail'].map(k => [k, async () => { emailCalls++; }]));
      if (name === 'otpauth') return {
        Secret: { fromBase32: value => value },
        TOTP: class { validate({ token }) { return token === '123456' ? 0 : null; } },
      };
      if (name === 'google-auth-library') return { OAuth2Client: class {
        async verifyIdToken() { googleCalls++; return { getPayload: () => ({ email: 'buyer@example.test', sub: 'google-id', email_verified: true }) }; }
      } };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      throw Error(name);
    },
  });
  cache.set(file, module.exports);
  return module.exports;
}
const limits = load('lib/auth-rate-limit.ts');
const routes = Object.fromEntries(['login', 'forgot-password', 'signup', 'reset-password', 'resend-verification', 'auth/google'].map(name => [name, load(`app/api/${name}/route.ts`)]));
const req = (body, headers = {}) => new Request('https://example.test/api', { method: 'POST', headers, body: JSON.stringify(body) });
beforeEach(async () => {
  queries = []; bcryptCalls = emailCalls = googleCalls = 0; storeBroken = false;
  delete env.AUTH_TRUSTED_IP_HEADER;
  await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
    CREATE TABLE users(user_id SERIAL PRIMARY KEY,email TEXT,password_hash TEXT,first_name TEXT,last_name TEXT,role TEXT DEFAULT 'customer',is_suspended BOOLEAN DEFAULT false,totp_enabled BOOLEAN DEFAULT false,totp_secret TEXT,phone_number TEXT,is_verified BOOLEAN DEFAULT false,avatar_url TEXT,google_id TEXT,reset_token_hash TEXT,reset_token_expires TIMESTAMPTZ,verification_token TEXT,verification_token_expires TIMESTAMPTZ);
    INSERT INTO users(user_id,email,password_hash,first_name,last_name) VALUES(1,'buyer@example.test','hash','Tea','Buyer');
    SELECT setval('users_user_id_seq',1);`);
  await db.exec(fs.readFileSync('lib/db/migrations/20261028_auth_rate_limits.sql', 'utf8'));
});
after(() => db.close());

test('atomic account ceiling holds across simultaneous requests and fresh module instances', async () => {
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => {
    cache.delete('lib/auth-rate-limit.ts');
    return load('lib/auth-rate-limit.ts').limitAuthAccount('login', i % 2 ? ' BUYER@example.test ' : 'buyer@example.test');
  }));
  assert.equal(results.filter(r => r === null).length, 15);
  assert.equal(results.filter(r => r?.status === 429).length, 10);
  const blocked = results.find(Boolean);
  assert.equal(blocked.headers.get('Cache-Control'), 'no-store');
  assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  assert.equal((await blocked.json()).retryAfter, Number(blocked.headers.get('Retry-After')));
  const { rows } = await db.query('SELECT * FROM auth_rate_limits');
  assert.equal(rows[0].attempts, 16);
  assert.match(rows[0].bucket_key, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(rows).includes('buyer'));
});

test('lockouts expire without extending on blocked attempts; stale counters are cleaned', async () => {
  for (let i = 0; i < 16; i++) await limits.limitAuthAccount('login', 'buyer@example.test');
  const original = (await db.query('SELECT expires_at FROM auth_rate_limits')).rows[0].expires_at;
  await limits.limitAuthAccount('login', 'buyer@example.test');
  assert.equal(String((await db.query('SELECT expires_at FROM auth_rate_limits')).rows[0].expires_at), String(original));
  await db.exec("UPDATE auth_rate_limits SET expires_at = now() - interval '1 second'");
  assert.equal(await limits.limitAuthAccount('login', 'buyer@example.test'), null);
  assert.equal((await db.query('SELECT attempts FROM auth_rate_limits')).rows[0].attempts, 1);
  await db.exec("INSERT INTO auth_rate_limits VALUES('expired',1,now()-interval '2 days')");
  await limits.limitAuthAccount('login', 'other@example.test');
  assert.equal((await db.query("SELECT * FROM auth_rate_limits WHERE bucket_key='expired'")).rows.length, 0);
});

test('arbitrary forwarding headers cannot select a client bucket; configured single IPs are validated', async () => {
  assert.equal(limits.authClientKey(req({}, { 'x-forwarded-for': '1.2.3.4', 'cf-connecting-ip': '1.2.3.4' })), 'shared-ingress');
  env.AUTH_TRUSTED_IP_HEADER = 'x-real-ip';
  assert.equal(limits.authClientKey(req({}, { 'x-real-ip': '1.2.3.4' })), '1.2.3.4');
  assert.equal(limits.authClientKey(req({}, { 'x-real-ip': '1.2.3.4, 5.6.7.8' })), 'shared-ingress');
  assert.equal(limits.authClientKey(req({}, { 'x-real-ip': '2001:db8::1' })), '2001:db8::1');
});

test('client ceiling blocks credential spraying across different accounts before password work', async () => {
  env.AUTH_TRUSTED_IP_HEADER = 'x-real-ip';
  for (let i = 0; i < 60; i++) {
    const response = await routes.login.POST(req({ email: `user${i}@example.test`, password: 'wrong' }, { 'x-real-ip': '1.2.3.4' }));
    assert.equal(response.status, 401);
  }
  assert.equal((await routes.login.POST(req({ email: 'new@example.test', password: 'wrong' }, { 'x-real-ip': '1.2.3.4' }))).status, 429);
  assert.equal(bcryptCalls, 60);
});

test('password and TOTP attempts share one account ceiling; correct credentials cannot bypass it', async () => {
  await db.exec("UPDATE users SET totp_enabled=true,totp_secret='secret'");
  assert.equal((await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password' }))).status, 200);
  for (let i = 0; i < 14; i++) assert.equal((await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password', totpCode: '000000' }))).status, 401);
  assert.equal((await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password', totpCode: '123456' }))).status, 429);
  assert.equal(bcryptCalls, 15);
});

test('normal customer/admin and TOTP login still issue tokens; suspended users do not', async () => {
  for (const role of ['customer', 'admin', 'super_admin']) {
    await db.query('UPDATE users SET role=$1', [role]);
    const response = await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).token, 'issued-token');
  }
  await db.exec("UPDATE users SET totp_enabled=true,totp_secret='secret'");
  assert.equal((await (await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password' }))).json()).requiresTotp, true);
  assert.equal((await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password', totpCode: '123456' }))).status, 200);
  await db.exec('UPDATE users SET is_suspended=true');
  assert.equal((await routes.login.POST(req({ email: 'buyer@example.test', password: 'correct-password' }))).status, 403);
});

test('missing and Google-only accounts return the same credential error after bcrypt work', async () => {
  await db.exec('UPDATE users SET password_hash=NULL');
  for (const email of ['buyer@example.test', 'missing@example.test']) {
    const response = await routes.login.POST(req({ email, password: 'wrong' }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'Invalid email or password.');
  }
  assert.equal(bcryptCalls, 2);
});

test('malformed login/Google bodies return 400 rather than throwing', async () => {
  for (const body of [null, {}, { email: {}, password: [] }, { email: 'buyer@example.test', password: 'x', totpCode: {} }]) {
    assert.equal((await routes.login.POST(req(body))).status, 400);
  }
  assert.equal((await routes.login.POST(new Request('https://example.test', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await routes['auth/google'].POST(req({ credential: {} }))).status, 400);
  assert.equal(bcryptCalls, 0);
  assert.equal(googleCalls, 0);
});

test('forgot-password keeps generic account responses and prevents repeated email sends', async () => {
  for (const email of ['buyer@example.test', 'missing@example.test']) {
    for (let i = 0; i < 3; i++) {
      const response = await routes['forgot-password'].POST(req({ email }));
      assert.equal(response.status, 200);
      assert.match((await response.json()).message, /If an account exists/);
    }
    assert.equal((await routes['forgot-password'].POST(req({ email }))).status, 429);
  }
  assert.equal(emailCalls, 3);
});

test('Google, signup, reset, and verification paths enforce their account limits before side effects', async () => {
  const scenarios = [
    ['google', 'buyer@example.test', 'auth/google', { credential: 'verified-google-fixture' }],
    ['signup', 'new@example.test', 'signup', { email: 'new@example.test', firstName: 'Tea', lastName: 'Buyer', password: 'TeaGarden123' }],
    ['reset', 'reset-token', 'reset-password', { token: 'reset-token', newPassword: 'TeaGarden123' }],
    ['verification', '1', 'resend-verification', {}],
  ];
  for (const [action, identity, route, body] of scenarios) {
    for (let i = 0; i < 30; i++) await limits.limitAuthAccount(action, identity);
    const before = emailCalls;
    const response = await routes[route].POST(req(body));
    assert.equal(response.status, 429, route);
    assert.equal(emailCalls, before);
  }
  assert.equal((await db.query('SELECT * FROM users')).rows.length, 1);
});

test('store failures fail closed with 503 and no credentials or emails processed', async () => {
  storeBroken = true;
  for (const route of Object.values(routes)) assert.equal((await route.POST(req({ email: 'buyer@example.test', password: 'correct-password' }))).status, 503);
  assert.equal(bcryptCalls, 0); assert.equal(emailCalls, 0); assert.equal(googleCalls, 0);
});

test('login redirect accepts local paths and rejects external and browser-normalized hosts', () => {
  const { safeAuthRedirect } = load('lib/auth-redirect.ts');
  assert.equal(safeAuthRedirect('/checkout?resumeOrderId=12'), '/checkout?resumeOrderId=12');
  for (const value of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test', 'javascript:alert(1)']) assert.equal(safeAuthRedirect(value), '/');
});
