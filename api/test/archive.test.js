import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let bhw1Token; // Purok 1
let bhw2Token; // Purok 2 and 3
let midwifeToken;
let adminToken;
let residentId;

before(async () => {
  const login = async (username) => {
    const res = await request(app).post('/api/auth/login').send({ username, password: 'Demo#12345' });
    return res.body.token;
  };
  bhw1Token = await login('bhw1');
  bhw2Token = await login('bhw2');
  midwifeToken = await login('midwife1');
  adminToken = await login('admin1');

  const created = await query(
    `INSERT INTO residents (household_id, last_name, first_name, relation_to_head, relation_other,
                            birth_date, sex, civil_status_code, education_code, is_active)
     VALUES (1, 'ArchiveTest', 'Temporary', 'OTHER', 'Tenant', '1994-02-02', 'F', 'S', 'HG', true)
     RETURNING id`
  );
  residentId = parseInt(created.rows[0].id, 10);
});

after(async () => {
  // Leave the demo data clean: the temporary resident stays archived.
  if (residentId) await query('UPDATE residents SET is_active = false WHERE id = $1', [residentId]);
  await pool.end();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('an archived resident is hidden from the default list and shown by status=archived', async () => {
  const del = await request(app)
    .delete(`/api/residents/${residentId}?reason=Moved+away`)
    .set(auth(bhw1Token));
  assert.equal(del.status, 200);
  assert.equal(del.body.is_active, false);
  assert.equal(del.body.deactivation_reason, 'Moved away');
  assert.ok(del.body.deactivated_at);
  assert.ok(del.body.deactivated_by_name);

  const active = await request(app).get('/api/residents?household_id=1&page_size=100').set(auth(bhw1Token));
  assert.equal(active.body.items.some((r) => r.id === residentId), false);

  const archived = await request(app)
    .get('/api/residents?status=archived&page_size=100')
    .set(auth(bhw1Token));
  assert.equal(archived.status, 200);
  const row = archived.body.items.find((r) => r.id === residentId);
  assert.ok(row, 'the archived resident is listed');
  assert.equal(row.is_active, false);
  assert.equal(row.deactivation_reason, 'Moved away');
  assert.ok(row.deactivated_at);
  assert.ok(row.deactivated_by_name);
  assert.ok(archived.body.items.every((r) => r.is_active === false), 'only archived residents are listed');
});

test('status=archived is limited to the BHW zones, and the Midwife sees all zones', async () => {
  const mine = await request(app).get('/api/residents?status=archived&page_size=100').set(auth(bhw2Token));
  assert.equal(mine.status, 200);
  assert.equal(mine.body.items.some((r) => r.id === residentId), false, 'Purok 1 is not visible to bhw2');

  const midwife = await request(app).get('/api/residents?status=archived&page_size=100').set(auth(midwifeToken));
  assert.equal(midwife.status, 200);
  assert.equal(midwife.body.items.some((r) => r.id === residentId), true);
});

test('status=archived rejects an unknown value (400) and the Admin (403)', async () => {
  const bad = await request(app).get('/api/residents?status=gone').set(auth(bhw1Token));
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'validation_failed');

  const admin = await request(app).get('/api/residents?status=archived').set(auth(adminToken));
  assert.equal(admin.status, 403);
});

test('POST /api/residents/:id/reactivate is refused for the Midwife (403) and for another zone (404)', async () => {
  const midwife = await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(midwifeToken));
  assert.equal(midwife.status, 403);
  assert.equal(midwife.body.error.code, 'forbidden');

  const otherZone = await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(bhw2Token));
  assert.equal(otherZone.status, 404);
  assert.equal(otherZone.body.error.code, 'not_found');

  const noToken = await request(app).post(`/api/residents/${residentId}/reactivate`);
  assert.equal(noToken.status, 401);
});

test('POST /api/residents/:id/reactivate returns 404 for an unknown resident', async () => {
  const res = await request(app).post('/api/residents/999999/reactivate').set(auth(bhw1Token));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});

test('POST /api/residents/:id/reactivate restores the resident and writes REACTIVATE to change_log', async () => {
  const res = await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(bhw1Token));
  assert.equal(res.status, 200);
  assert.equal(res.body.is_active, true);
  assert.equal(res.body.deactivated_at, null);
  assert.equal(res.body.deactivation_reason, null);

  const log = await query(
    `SELECT action, changed_by FROM change_log
      WHERE table_name = 'residents' AND record_id = $1 AND action = 'REACTIVATE'
      ORDER BY id DESC LIMIT 1`,
    [residentId]
  );
  assert.equal(log.rows.length, 1);
  assert.equal(parseInt(log.rows[0].changed_by, 10), 3, 'stamped with bhw1');

  const active = await request(app).get('/api/residents?household_id=1&page_size=100').set(auth(bhw1Token));
  assert.equal(active.body.items.some((r) => r.id === residentId), true, 'back in the active list');
});

test('POST /api/residents/:id/reactivate on an active resident is a 400', async () => {
  const res = await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(bhw1Token));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('POST /api/residents/:id/reactivate maps a clash with an active record to 400', async () => {
  // Archive the temporary resident, add an active twin (same name and birth date), then try to restore.
  await request(app).delete(`/api/residents/${residentId}`).set(auth(bhw1Token));
  const twin = await query(
    `INSERT INTO residents (household_id, last_name, first_name, relation_to_head, relation_other,
                            birth_date, sex, civil_status_code, education_code, is_active)
     VALUES (1, 'ArchiveTest', 'Temporary', 'OTHER', 'Tenant', '1994-02-02', 'F', 'S', 'HG', true)
     RETURNING id`
  );
  const twinId = parseInt(twin.rows[0].id, 10);
  try {
    const res = await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(bhw1Token));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'duplicate_resident');
    assert.ok(!JSON.stringify(res.body).includes('ArchiveTest'), 'no resident data in the error');
  } finally {
    await query('UPDATE residents SET is_active = false WHERE id = $1', [twinId]);
  }
});
