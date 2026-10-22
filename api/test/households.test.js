import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let bhw1Token; // assigned to Purok 1 (zone_id: 1)
let midwifeToken; // all zones, read-only
let createdHouseholdId;

before(async () => {
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  bhw1Token = await login('bhw1');
  midwifeToken = await login('midwife1');
});

after(async () => {
  // Soft deactivate any test household created
  if (createdHouseholdId) {
    await query('UPDATE households SET is_active = false WHERE id = $1', [createdHouseholdId]);
    await query('UPDATE residents SET is_active = false WHERE household_id = $1', [createdHouseholdId]);
  }
  await pool.end();
});

test('POST /api/households succeeds (201 Created) for BHW in assigned zone', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const payload = {
    household_no: `202610-TAGO-${rand}`,
    date_of_visit: '2026-10-05',
    zone_id: 1,
    water_source_code: 'LV3',
    toilet_facility_code: 'P',
    is_4ps_household: false,
    members: [
      {
        last_name: `Santos${rand}`,
        first_name: 'Juan',
        middle_name: 'Lopez',
        relation_to_head: 'HEAD',
        birth_date: '1988-04-15',
        sex: 'M',
        civil_status_code: 'M',
        education_code: 'HG',
        occupation: 'Fisherman',
        medical_conditions: [{ condition_code: 'HPN' }],
      },
      {
        last_name: `Santos${rand}`,
        first_name: 'Juana',
        middle_name: 'Reyes',
        relation_to_head: 'SPOUSE',
        birth_date: '1990-06-20',
        sex: 'F',
        civil_status_code: 'M',

        education_code: 'HG',
        is_pregnant: false,
        uses_fp: true,
        fp_method_code: 'IUD',
        fp_status_code: 'CU',
        medical_conditions: [],
      },
    ],
  };

  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.household_no, payload.household_no);
  assert.equal(res.body.zone_id, 1);
  assert.equal(res.body.zone_name, 'Purok 1');
  assert.equal(res.body.members.length, 2);

  createdHouseholdId = res.body.id;

  // Check derived properties on resident
  const head = res.body.members.find((m) => m.relation_to_head === 'HEAD');
  assert.equal(head.last_name, payload.members[0].last_name);
  assert.equal(head.first_name, 'Juan');

  assert.ok(head.age_years >= 35);
  assert.equal(head.age_risk_group, 'A'); // Adult
  assert.equal(head.medical_conditions.length, 1);
  assert.equal(head.medical_conditions[0].condition_code, 'HPN');
});

test('POST /api/households fails with 400 duplicate_resident when member matches active resident', async () => {
  // Antonio Reyes already exists in household 1
  const payload = {
    household_no: '202610-TAGO-00098',
    date_of_visit: '2026-10-05',
    zone_id: 1,
    members: [
      {
        last_name: 'Reyes',
        first_name: 'Antonio',
        middle_name: 'Santos',
        relation_to_head: 'HEAD',
        birth_date: '1958-07-16', // Approximate/same birth date from seed
        sex: 'M',
        civil_status_code: 'M',
        education_code: 'HG',
      },
    ],
  };

  // Find actual birth date of Antonio from DB
  const antRes = await query("SELECT birth_date FROM residents WHERE first_name = 'Antonio' LIMIT 1");
  const d = antRes.rows[0].birth_date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  payload.members[0].birth_date = `${y}-${m}-${day}`;

  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'duplicate_resident');
  assert.ok(res.body.error.message.includes('already exists'));
});

test('POST /api/households fails with 400 validation_failed when two heads are provided', async () => {
  const payload = {
    household_no: '202610-TAGO-00097',
    date_of_visit: '2026-10-05',
    zone_id: 1,
    members: [
      {
        last_name: 'UniqueOne',
        first_name: 'PersonA',
        relation_to_head: 'HEAD',
        birth_date: '1985-01-01',
        sex: 'M',
        civil_status_code: 'S',
        education_code: 'HG',
      },
      {
        last_name: 'UniqueTwo',
        first_name: 'PersonB',
        relation_to_head: 'HEAD', // Second HEAD -> Invalid!
        birth_date: '1987-02-02',
        sex: 'F',
        civil_status_code: 'S',
        education_code: 'HG',
      },
    ],
  };

  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('POST /api/households fails with 403 forbidden when BHW encodes outside assigned zone', async () => {
  // bhw1 is assigned only to zone 1, attempts zone 2
  const payload = {
    household_no: '202610-TAGO-00096',
    date_of_visit: '2026-10-05',
    zone_id: 2,
    members: [
      {
        last_name: 'ZoneTest',
        first_name: 'Person',
        relation_to_head: 'HEAD',
        birth_date: '1992-03-03',
        sex: 'M',
        civil_status_code: 'S',
        education_code: 'HG',
      },
    ],
  };

  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send(payload);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
  assert.equal(res.body.error.message, 'You do not have access to this zone.');
});

test('POST /api/households fails with 403 forbidden for Midwife (read-only role)', async () => {
  const payload = {
    household_no: '202610-TAGO-00095',
    date_of_visit: '2026-10-05',
    zone_id: 1,
    members: [
      {
        last_name: 'MidwifeTest',
        first_name: 'Person',
        relation_to_head: 'HEAD',
        birth_date: '1995-05-05',
        sex: 'F',
        civil_status_code: 'S',
        education_code: 'HG',
      },
    ],
  };

  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send(payload);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('GET /api/households/:id succeeds (200 OK) for Midwife across all zones', async () => {
  // Household 1 is in Zone 1
  const res1 = await request(app)
    .get('/api/households/1')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res1.status, 200);
  assert.equal(res1.body.id, 1);
  assert.equal(res1.body.zone_name, 'Purok 1');
  assert.ok(res1.body.members.length > 0);

  // Household 3 is in Zone 2
  const res3 = await request(app)
    .get('/api/households/3')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res3.status, 200);
  assert.equal(res3.body.id, 3);
  assert.equal(res3.body.zone_name, 'Purok 2');
  assert.ok(res3.body.members.length > 0);
});

test('GET /api/households/:id returns 404 not_found when BHW queries household outside their zone', async () => {
  // bhw1 is assigned to Zone 1, household 3 is in Zone 2
  const res = await request(app)
    .get('/api/households/3')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
  assert.equal(res.body.error.message, 'Household not found.');
});

test('GET /api/households/:id returns 404 not_found for non-existent household', async () => {
  const res = await request(app)
    .get('/api/households/999999')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});
