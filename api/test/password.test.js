import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

// A dedicated synthetic account, so the demo logins keep Demo#12345.
const USERNAME = 'test_pwchange';
const START = 'Start#12345';
const NEXT = 'Next#67890';

const login = (password) => request(app).post('/api/auth/login').send({ username: USERNAME, password });
const change = (token, body) => {
  const r = request(app).post('/api/auth/password');
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r.send(body);
};

before(async () => {
  const hash = await bcrypt.hash(START, 10);
  await query(
    `INSERT INTO users (username, password_hash, full_name, role, is_active)
     VALUES ($1, $2, 'Test Password User', 'MIDWIFE', true)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`,
    [USERNAME, hash]
  );
  await query(
    `UPDATE auth_sessions SET revoked_at = now()
      WHERE user_id = (SELECT id FROM users WHERE username = $1) AND revoked_at IS NULL`,
    [USERNAME]
  );
});

after(async () => {
  await pool.end();
});

test('POST /api/auth/password without a token fails (401 unauthenticated)', async () => {
  const res = await change(null, { current_password: START, new_password: NEXT });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'unauthenticated');
});

test('POST /api/auth/password with a wrong current password fails (400) and keeps the session', async () => {
  const { body } = await login(START);
  const res = await change(body.token, { current_password: 'Wrong#00000', new_password: NEXT });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
  assert.equal(res.body.error.details[0].field, 'current_password');

  // Still signed in: a wrong guess must not end the session.
  const out = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${body.token}`);
  assert.equal(out.status, 200);
});

test('POST /api/auth/password rejects a short new password (400 validation_failed)', async () => {
  const { body } = await login(START);
  const res = await change(body.token, { current_password: START, new_password: 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
  assert.ok(res.body.error.details.some((d) => d.field === 'new_password'));
});

test('POST /api/auth/password rejects reusing the current password (400 validation_failed)', async () => {
  const { body } = await login(START);
  const res = await change(body.token, { current_password: START, new_password: START });
  assert.equal(res.status, 400);
  assert.ok(res.body.error.details.some((d) => d.field === 'new_password'));
});

test('POST /api/auth/password rejects fields it does not accept, e.g. role (400)', async () => {
  const { body } = await login(START);
  const res = await change(body.token, { current_password: START, new_password: NEXT, role: 'ADMIN' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('POST /api/auth/password changes the password and signs out other sessions only', async () => {
  const a = (await login(START)).body.token; // session that changes the password
  const b = (await login(START)).body.token; // another device

  const res = await change(a, { current_password: START, new_password: NEXT });
  assert.equal(res.status, 200);
  assert.ok(res.body.other_sessions_revoked >= 1);
  assert.equal(res.body.password_hash, undefined);

  // Other device is signed out; this device stays signed in.
  const other = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${b}`);
  assert.equal(other.status, 401);
  const self = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${a}`);
  assert.equal(self.status, 200);

  // Old password no longer works; the new one does.
  assert.equal((await login(START)).status, 401);
  assert.equal((await login(NEXT)).status, 200);

  // The change is stamped with who made it (audit trigger via app.current_user_id).
  const row = await query('SELECT id, updated_by FROM users WHERE username = $1', [USERNAME]);
  assert.equal(String(row.rows[0].updated_by), String(row.rows[0].id));

  // change_log records that the password changed and by whom, never the hash itself.
  const log = await query(
    `SELECT changed_by, changed_fields, old_data, new_data FROM change_log
      WHERE table_name = 'users' AND record_id = $1 AND 'password_hash' = ANY (changed_fields)
      ORDER BY id DESC LIMIT 1`,
    [row.rows[0].id]
  );
  assert.equal(log.rows.length, 1);
  assert.equal(String(log.rows[0].changed_by), String(row.rows[0].id));
  assert.equal(log.rows[0].new_data.password_hash, undefined);
  assert.equal(log.rows[0].old_data.password_hash, undefined);
});
