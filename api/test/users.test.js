import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let adminToken;
let midwifeToken;
let bhwToken;
const createdUserIds = [];

before(async () => {
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  adminToken = await login('admin1');
  midwifeToken = await login('midwife1');
  bhwToken = await login('bhw1');
});

after(async () => {
  // Soft deactivate test users created in these tests
  for (const id of createdUserIds) {
    await query('UPDATE users SET is_active = false WHERE id = $1', [id]);
  }
  await pool.end();
});

test('GET /api/users succeeds for ADMIN and never leaks password hashes', async () => {
  const res = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.ok(res.body.total >= 4); // admin1, midwife1, bhw1, bhw2
  assert.equal(res.body.page, 1);
  assert.equal(res.body.page_size, 25);

  // Verify fields: password and password_hash must never be present
  for (const user of res.body.items) {
    assert.ok(user.id);
    assert.ok(user.username);
    assert.ok(user.full_name);
    assert.ok(user.role);
    assert.equal(typeof user.is_active, 'boolean');
    assert.equal(user.password, undefined);
    assert.equal(user.password_hash, undefined);

    if (user.role === 'BHW') {
      assert.ok(Array.isArray(user.zone_ids));
    }
  }
});

test('GET /api/users filters by role and include_inactive', async () => {
  const resRole = await request(app)
    .get('/api/users?role=MIDWIFE')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(resRole.status, 200);
  assert.ok(resRole.body.items.length >= 1);
  assert.ok(resRole.body.items.every((u) => u.role === 'MIDWIFE'));

  const resInactive = await request(app)
    .get('/api/users?include_inactive=false')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(resInactive.status, 200);
  assert.ok(resInactive.body.items.every((u) => u.is_active === true));
});

test('GET /api/users fails with 403 forbidden for BHW and MIDWIFE', async () => {
  const bhwRes = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${bhwToken}`);
  assert.equal(bhwRes.status, 403);
  assert.equal(bhwRes.body.error.code, 'forbidden');

  const midwifeRes = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(midwifeRes.status, 403);
  assert.equal(midwifeRes.body.error.code, 'forbidden');
});

test('GET /api/users fails with 401 unauthenticated when no token is sent', async () => {
  const res = await request(app).get('/api/users');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'unauthenticated');
});

test('POST /api/users creates a new BHW user with zone assignments', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const username = `bhw_test_${rand}`;
  const payload = {
    username,
    password: 'ValidPassword123!',
    full_name: 'Test BHW Admin Created',
    role: 'BHW',
    zone_ids: [1, 2],
  };

  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  assert.equal(res.status, 201);
  assert.ok(res.headers.location);
  assert.equal(res.body.username, username);
  assert.equal(res.body.full_name, payload.full_name);
  assert.equal(res.body.role, 'BHW');
  assert.deepEqual(res.body.zone_ids, [1, 2]);
  assert.equal(res.body.password, undefined);
  assert.equal(res.body.password_hash, undefined);

  createdUserIds.push(res.body.id);

  // Verify the new user can successfully log in with their credentials
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'ValidPassword123!' });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  assert.deepEqual(loginRes.body.user.zone_ids, [1, 2]);
});

test('POST /api/users fails with 400 validation_failed when non-BHW has zone_ids', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const payload = {
    username: `midwife_test_${rand}`,
    password: 'ValidPassword123!',
    full_name: 'Test Midwife with zones',
    role: 'MIDWIFE',
    zone_ids: [1],
  };

  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('POST /api/users fails with 400 when username already exists', async () => {
  const payload = {
    username: 'admin1', // already seeded in database
    password: 'AnotherPassword123!',
    full_name: 'Duplicate Admin',
    role: 'ADMIN',
  };

  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
  assert.equal(res.body.error.message, 'Username is already taken.');
});

test('POST /api/users fails with 400 for short password (< 8 chars)', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const payload = {
    username: `user_${rand}`,
    password: 'short',
    full_name: 'Short Pass User',
    role: 'BHW',
  };

  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('POST /api/users fails with 403 for non-admin accounts', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const payload = {
    username: `bhw_unauth_${rand}`,
    password: 'ValidPassword123!',
    full_name: 'Unauthorized Creator',
    role: 'BHW',
  };

  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${bhwToken}`)
    .send(payload);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('PATCH /api/users/:id updates full_name, password, and zone assignments', async () => {
  // First create a test BHW user
  const rand = Math.floor(10000 + Math.random() * 89999);
  const username = `patch_user_${rand}`;
  const createRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username,
      password: 'OldPassword123!',
      full_name: 'Original Full Name',
      role: 'BHW',
      zone_ids: [1],
    });

  assert.equal(createRes.status, 201);
  const userId = createRes.body.id;
  createdUserIds.push(userId);

  // Update full_name, password, and zone_ids
  const patchRes = await request(app)
    .patch(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      full_name: 'Updated Full Name',
      password: 'NewPassword123!',
      zone_ids: [2, 3],
    });

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.full_name, 'Updated Full Name');
  assert.deepEqual(patchRes.body.zone_ids, [2, 3]);

  // Verify new password works for login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'NewPassword123!' });
  assert.equal(loginRes.status, 200);

  // Old password must fail
  const oldLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'OldPassword123!' });
  assert.equal(oldLoginRes.status, 401);
});

test('PATCH /api/users/:id fails with 400 when assigning zone_ids to non-BHW role', async () => {
  // Create midwife
  const rand = Math.floor(10000 + Math.random() * 89999);
  const createRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username: `mw_${rand}`,
      password: 'ValidPassword123!',
      full_name: 'Test Midwife Patch',
      role: 'MIDWIFE',
    });

  assert.equal(createRes.status, 201);
  const userId = createRes.body.id;
  createdUserIds.push(userId);

  const patchRes = await request(app)
    .patch(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ zone_ids: [1] });

  assert.equal(patchRes.status, 400);
  assert.equal(patchRes.body.error.code, 'validation_failed');
});

test('PATCH /api/users/:id returns 404 for non-existent user', async () => {
  const res = await request(app)
    .patch('/api/users/999999')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ full_name: 'Does Not Exist' });

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});

test('Deactivating user revokes open sessions and prevents login', async () => {
  // Create a user
  const rand = Math.floor(10000 + Math.random() * 89999);
  const username = `deact_user_${rand}`;
  const createRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username,
      password: 'PasswordDeact123!',
      full_name: 'To Be Deactivated',
      role: 'BHW',
      zone_ids: [1],
    });

  assert.equal(createRes.status, 201);
  const userId = createRes.body.id;
  createdUserIds.push(userId);

  // User logs in and gets an active session
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'PasswordDeact123!' });

  assert.equal(loginRes.status, 200);
  const userToken = loginRes.body.token;

  // Verify the user can access authorized routes
  const accessBefore = await request(app)
    .get('/api/residents')
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(accessBefore.status, 200);

  // Admin deactivates the user
  const deactRes = await request(app)
    .patch(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ is_active: false });

  assert.equal(deactRes.status, 200);
  assert.equal(deactRes.body.is_active, false);

  // Session must be revoked immediately: token request fails with 401 unauthenticated
  const accessAfter = await request(app)
    .get('/api/residents')
    .set('Authorization', `Bearer ${userToken}`);
  assert.equal(accessAfter.status, 401);
  assert.equal(accessAfter.body.error.code, 'unauthenticated');

  // New login attempt must fail with 401 invalid_credentials
  const newLogin = await request(app)
    .post('/api/auth/login')
    .send({ username, password: 'PasswordDeact123!' });
  assert.equal(newLogin.status, 401);
  assert.equal(newLogin.body.error.code, 'invalid_credentials');
});
