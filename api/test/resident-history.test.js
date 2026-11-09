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

const auth = (token) => ({ Authorization: `Bearer ${token}` });

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
     VALUES (1, 'HistoryTest', 'Temporary', 'OTHER', 'Tenant', '1992-04-04', 'M', 'S', 'HG', true)
     RETURNING id`
  );
  residentId = parseInt(created.rows[0].id, 10);
});

after(async () => {
  if (residentId) await query('UPDATE residents SET is_active = false WHERE id = $1', [residentId]);
  await pool.end();
});

test('an edit shows up in the history with who, when and the changed field names', async () => {
  const patch = await request(app)
    .patch(`/api/residents/${residentId}`)
    .set(auth(bhw1Token))
    .send({ occupation: 'Teacher' });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.updated_by_name, 'Demo BHW One', 'the record says who last changed it');

  const res = await request(app).get(`/api/residents/${residentId}/history`).set(auth(midwifeToken));
  assert.equal(res.status, 200);
  assert.ok(res.body.total >= 2, 'the insert and the edit');
  assert.equal(res.body.page, 1);

  const edit = res.body.items[0];
  assert.equal(edit.action, 'UPDATE');
  assert.equal(edit.changed_by_name, 'Demo BHW One');
  assert.deepEqual(edit.changed_fields, ['occupation']);
  assert.ok(new Date(edit.changed_at).getTime() > Date.now() - 5 * 60 * 1000);
  assert.equal(edit.old_data, undefined, 'values are never returned');
  assert.equal(edit.new_data, undefined, 'values are never returned');
  assert.ok(res.body.items[0].id > res.body.items[1].id, 'newest first');
});

test('changing only the medical conditions is recorded as a change to the resident', async () => {
  const patch = await request(app)
    .patch(`/api/residents/${residentId}`)
    .set(auth(bhw1Token))
    .send({ medical_conditions: [{ condition_code: 'HPN' }] });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.updated_by_name, 'Demo BHW One');

  const res = await request(app).get(`/api/residents/${residentId}/history`).set(auth(bhw1Token));
  assert.equal(res.status, 200);
  const fields = res.body.items.flatMap((i) => i.changed_fields);
  assert.ok(fields.includes('medical_conditions'), 'the condition change is listed');
});

test('the resident list carries who last changed each record', async () => {
  const res = await request(app).get('/api/residents?household_id=1&page_size=100').set(auth(bhw1Token));
  assert.equal(res.status, 200);
  const row = res.body.items.find((r) => r.id === residentId);
  assert.ok(row);
  assert.equal(row.updated_by_name, 'Demo BHW One');
  assert.ok(row.updated_at);
});

test('an archived resident keeps their history, with the archive and the restore in it', async () => {
  await request(app).delete(`/api/residents/${residentId}?reason=Test`).set(auth(bhw1Token));
  await request(app).post(`/api/residents/${residentId}/reactivate`).set(auth(bhw1Token));

  const res = await request(app).get(`/api/residents/${residentId}/history?page_size=100`).set(auth(bhw1Token));
  assert.equal(res.status, 200);
  const actions = res.body.items.map((i) => i.action);
  assert.ok(actions.includes('DEACTIVATE'));
  assert.ok(actions.includes('REACTIVATE'));
  assert.ok(actions.includes('CREATE'));
});

test('history is limited to the BHW zones (404), refused for the Admin (403) and anonymous callers (401)', async () => {
  const otherZone = await request(app).get(`/api/residents/${residentId}/history`).set(auth(bhw2Token));
  assert.equal(otherZone.status, 404);
  assert.equal(otherZone.body.error.code, 'not_found');

  const admin = await request(app).get(`/api/residents/${residentId}/history`).set(auth(adminToken));
  assert.equal(admin.status, 403);

  const anon = await request(app).get(`/api/residents/${residentId}/history`);
  assert.equal(anon.status, 401);
});

test('history returns 404 for an unknown resident and 400 for a bad id', async () => {
  const missing = await request(app).get('/api/residents/999999/history').set(auth(bhw1Token));
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'not_found');

  const bad = await request(app).get('/api/residents/abc/history').set(auth(bhw1Token));
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'validation_failed');
});

test('history is paged', async () => {
  const res = await request(app).get(`/api/residents/${residentId}/history?page=1&page_size=2`).set(auth(bhw1Token));
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.page_size, 2);
  assert.ok(res.body.total > 2);
});
