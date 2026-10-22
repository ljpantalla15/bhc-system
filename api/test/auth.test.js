import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let deactUserId = null;

before(async () => {
  // Ensure test deactivated user exists for testing
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Demo#12345', salt);
  const res = await query(
    `INSERT INTO users (username, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (username) DO UPDATE SET is_active = false
     RETURNING id`,
    ['test_deactivated', hash, 'Test Deactivated User', 'BHW']
  );
  deactUserId = res.rows[0].id;
});

after(async () => {
  await pool.end();
});


test('POST /api/auth/login succeeds with valid BHW credentials', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bhw1', password: 'Demo#12345' });

  assert.equal(res.status, 200);
  assert.equal(typeof res.body.token, 'string');
  assert.equal(res.body.token_type, 'Bearer');
  assert.ok(!isNaN(Date.parse(res.body.expires_at)));

  // Verify user shape
  const user = res.body.user;
  assert.equal(user.username, 'bhw1');
  assert.equal(user.role, 'BHW');
  assert.equal(user.is_active, true);
  assert.deepEqual(user.zone_ids, [1]);
  assert.equal(user.password_hash, undefined); // Hard rule 6: Never expose password_hash
});

test('POST /api/auth/login succeeds with Midwife credentials (no zone_ids)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'midwife1', password: 'Demo#12345' });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, 'midwife1');
  assert.equal(res.body.user.role, 'MIDWIFE');
  assert.equal(res.body.user.zone_ids, undefined);
});

test('POST /api/auth/login fails with wrong password (401 invalid_credentials)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bhw1', password: 'WrongPassword#999' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'invalid_credentials');
  assert.equal(res.body.error.message, 'Invalid username or password.');
});

test('POST /api/auth/login fails with non-existent username (401 invalid_credentials)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'nobody_here', password: 'Demo#12345' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'invalid_credentials');
  assert.equal(res.body.error.message, 'Invalid username or password.');
});

test('POST /api/auth/login fails with validation error for short username (400 validation_failed)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'ab', password: 'Demo#12345' });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
  assert.ok(Array.isArray(res.body.error.details));
});

test('POST /api/auth/login fails for deactivated user (401 invalid_credentials)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'test_deactivated', password: 'Demo#12345' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'invalid_credentials');
  assert.equal(res.body.error.message, 'Invalid username or password.');
});

test('POST /api/auth/logout revokes session and prevents token reuse (401 unauthenticated)', async () => {
  // 1. Log in
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bhw2', password: 'Demo#12345' });

  assert.equal(loginRes.status, 200);
  const token = loginRes.body.token;

  // 2. Log out
  const logoutRes = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(logoutRes.status, 200);
  assert.deepEqual(logoutRes.body, { message: 'Session ended.' });

  // 3. Attempt to reuse token on logout again
  const reuseRes = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(reuseRes.status, 401);
  assert.equal(reuseRes.body.error.code, 'unauthenticated');
  assert.equal(reuseRes.body.error.message, 'Session has been revoked.');
});

test('POST /api/auth/logout without token fails (401 unauthenticated)', async () => {
  const res = await request(app).post('/api/auth/logout');

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'unauthenticated');
});
