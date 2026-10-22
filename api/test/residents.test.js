import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let bhw1Token; // assigned to Purok 1
let midwifeToken; // all zones, read-only
let tempResidentId;

before(async () => {
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  bhw1Token = await login('bhw1');
  midwifeToken = await login('midwife1');

  // Insert a dedicated adult test resident in household 1 for deactivation test
  const tempRes = await query(
    `INSERT INTO residents (household_id, last_name, first_name, relation_to_head, relation_other, birth_date, sex, civil_status_code, education_code, is_active)
     VALUES (1, 'TestAdult', 'Temporary', 'OTHER', 'Tenant', '1995-01-01', 'M', 'S', 'HG', true)
     RETURNING id`
  );
  tempResidentId = parseInt(tempRes.rows[0].id, 10);
});


after(async () => {
  // Restore any test updates / deactivations to keep demo seed clean
  await query("UPDATE residents SET occupation = 'Retired' WHERE id = 1");
  if (tempResidentId) {
    await query('UPDATE residents SET is_active = false WHERE id = $1', [tempResidentId]);
  }
  await pool.end();
});


test('GET /api/residents returns paginated resident list for Midwife', async () => {
  const res = await request(app)
    .get('/api/residents?page=1&page_size=5')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.page_size, 5);
  assert.equal(res.body.items.length, 5);
  assert.ok(res.body.total >= 10);


  const resident = res.body.items[0];
  assert.ok(resident.id);
  assert.ok(resident.last_name);
  assert.ok(resident.first_name);
  assert.ok(resident.birth_date);
  assert.ok(typeof resident.age_years === 'number');
  assert.ok(resident.age_risk_group);
  assert.ok(Array.isArray(resident.medical_conditions));
});

test('GET /api/residents filters by name search query q', async () => {
  const res = await request(app)
    .get('/api/residents?q=Reyes')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 3);
  for (const item of res.body.items) {
    const fullName = `${item.last_name} ${item.first_name}`.toLowerCase();
    assert.ok(fullName.includes('reyes') || item.last_name.toLowerCase().includes('reyes'));
  }
});

test('GET /api/residents filters by age_risk_group=SC (Senior Citizen)', async () => {
  const res = await request(app)
    .get('/api/residents?age_risk_group=SC')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 2);
  for (const item of res.body.items) {
    assert.equal(item.age_risk_group, 'SC');
    assert.ok(item.age_years >= 60);
  }
});

test('GET /api/residents filters by household_id', async () => {
  const res = await request(app)
    .get('/api/residents?household_id=1')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 4);
  for (const item of res.body.items) {
    assert.equal(item.household_id, 1);
    assert.equal(item.household_no, res.body.items[0].household_no);
  }
});

test('GET /api/residents scopes BHW to assigned zones only and returns 403 on unassigned zone', async () => {
  // bhw1 without zone_id: only returns Purok 1 (zone_id: 1)
  const resScoped = await request(app)
    .get('/api/residents')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(resScoped.status, 200);
  for (const item of resScoped.body.items) {
    assert.equal(item.zone_id, 1);
  }

  // bhw1 requesting zone_id=2: 403 forbidden
  const resForbidden = await request(app)
    .get('/api/residents?zone_id=2')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(resForbidden.status, 403);
  assert.equal(resForbidden.body.error.code, 'forbidden');
});

test('PATCH /api/residents/:id updates resident and writes to change_log', async () => {
  // Update Antonio Reyes (id: 1 in zone 1)
  const patchRes = await request(app)
    .patch('/api/residents/1')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({
      occupation: 'Senior Consultant',
      medical_conditions: [{ condition_code: 'HPN' }, { condition_code: 'DM' }],
    });

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.occupation, 'Senior Consultant');
  assert.equal(patchRes.body.medical_conditions.length, 2);

  // Verify change_log row exists for this update with changed_by = 3 (bhw1)
  const logRes = await query(
    `SELECT action, changed_by, changed_fields
       FROM change_log
      WHERE table_name = 'residents' AND record_id = 1 AND action = 'UPDATE'
      ORDER BY id DESC LIMIT 1`
  );

  assert.ok(logRes.rows.length > 0);
  assert.equal(logRes.rows[0].action, 'UPDATE');
  assert.equal(parseInt(logRes.rows[0].changed_by, 10), 3);
  assert.ok(logRes.rows[0].changed_fields.includes('occupation'));
});

test('PATCH /api/residents/:id fails for Midwife (403 forbidden)', async () => {
  const res = await request(app)
    .patch('/api/residents/1')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ occupation: 'Doctor' });

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('PATCH /api/residents/:id returns 404 for resident in unassigned zone', async () => {
  // Resident 9 (Rosa Bautista) is in Purok 2, bhw1 is assigned only to Purok 1
  const res = await request(app)
    .patch('/api/residents/9')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({ occupation: 'Mechanic' });

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});

test('DELETE /api/residents/:id deactivates resident and writes DEACTIVATE to change_log', async () => {
  // Deactivate tempResidentId in Zone 1
  const delRes = await request(app)
    .delete(`/api/residents/${tempResidentId}?reason=Moved+to+Manila`)
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(delRes.status, 200);
  assert.equal(delRes.body.is_active, false);

  // Verify change_log has action DEACTIVATE with changed_by = 3
  const logRes = await query(
    `SELECT action, changed_by, changed_fields
       FROM change_log
      WHERE table_name = 'residents' AND record_id = $1 AND action = 'DEACTIVATE'
      ORDER BY id DESC LIMIT 1`,
    [tempResidentId]
  );

  assert.ok(logRes.rows.length > 0);
  assert.equal(logRes.rows[0].action, 'DEACTIVATE');
  assert.equal(parseInt(logRes.rows[0].changed_by, 10), 3);

  // Verify GET /api/residents without include_inactive omits temp resident
  const activeRes = await request(app)
    .get('/api/residents?household_id=1')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(activeRes.body.items.some((r) => r.id === tempResidentId), false);

  // Verify GET /api/residents with include_inactive=true includes temp resident
  const allRes = await request(app)
    .get('/api/residents?household_id=1&include_inactive=true')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(allRes.body.items.some((r) => r.id === tempResidentId), true);
});


test('DELETE /api/residents/:id returns 404 for resident in unassigned zone', async () => {
  // Resident 9 is in Zone 2, bhw1 is assigned only to Zone 1
  const res = await request(app)
    .delete('/api/residents/9')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});


test('DELETE /api/residents/:id fails for Midwife (403 forbidden)', async () => {
  const res = await request(app)
    .delete('/api/residents/1')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});
