import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

let midwifeToken;
let bhw1Token; // assigned to Purok 1 (zone_id: 1)
let bhw2Token; // assigned to Purok 2 & 3 (zone_ids: [2, 3])
let adminToken;

before(async () => {
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  midwifeToken = await login('midwife1');
  bhw1Token = await login('bhw1');
  bhw2Token = await login('bhw2');
  adminToken = await login('admin1');
});

after(async () => {
  await pool.end();
});

test('GET /api/masterlists?category=SENIOR_CITIZEN returns senior citizens for Midwife (all zones)', async () => {
  const res = await request(app)
    .get('/api/masterlists?category=SENIOR_CITIZEN')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.category, 'SENIOR_CITIZEN');
  assert.equal(res.body.total, 2);
  assert.equal(res.body.items.length, 2);

  const names = res.body.items.map((r) => `${r.first_name} ${r.last_name}`);
  assert.ok(names.includes('Antonio Reyes'));
  assert.ok(names.includes('Luisa Reyes'));

  for (const item of res.body.items) {
    assert.ok(item.age_years >= 60);
    assert.equal(item.age_risk_group, 'SC');
  }
});

test('GET /api/masterlists?category=UNDER_FIVE returns under-5 children for Midwife (all zones)', async () => {
  const res = await request(app)
    .get('/api/masterlists?category=UNDER_FIVE')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.category, 'UNDER_FIVE');
  assert.equal(res.body.total, 3);
  assert.equal(res.body.items.length, 3);

  for (const item of res.body.items) {
    assert.ok(item.age_years < 5);
  }
});

test('GET /api/masterlists?category=PREGNANT returns pregnant women for Midwife (all zones)', async () => {
  const res = await request(app)
    .get('/api/masterlists?category=PREGNANT')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.category, 'PREGNANT');
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].first_name, 'Maria');
  assert.equal(res.body.items[0].is_pregnant, true);
  assert.ok(res.body.items[0].lmp_date);
});

test('GET /api/masterlists?category=PWD returns persons with disabilities for Midwife (all zones)', async () => {
  const res = await request(app)
    .get('/api/masterlists?category=PWD')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.category, 'PWD');
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].first_name, 'Ramon');
  assert.equal(res.body.items[0].is_pwd, true);
  assert.equal(res.body.items[0].disability_type_code, 'ORTHO');
});

test('BHW1 gets only assigned zones in masterlists without zone_id', async () => {
  // bhw1 is assigned to Purok 1 only
  const res = await request(app)
    .get('/api/masterlists?category=UNDER_FIVE')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2); // 2 in Purok 1, 1 in Purok 2 is excluded
  for (const item of res.body.items) {
    assert.equal(item.zone_id, 1);
  }
});

test('BHW1 gets 403 when requesting an unassigned zone_id', async () => {
  // bhw1 requesting zone_id=2 (Purok 2)
  const res = await request(app)
    .get('/api/masterlists?category=UNDER_FIVE&zone_id=2')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
  assert.equal(res.body.error.message, 'You do not have access to this zone.');
});

test('BHW2 gets only assigned zones (Purok 2 & 3)', async () => {
  // bhw2 requesting UNDER_FIVE -> 1 in Purok 2
  const resUnder5 = await request(app)
    .get('/api/masterlists?category=UNDER_FIVE')
    .set('Authorization', `Bearer ${bhw2Token}`);

  assert.equal(resUnder5.status, 200);
  assert.equal(resUnder5.body.total, 1);
  assert.equal(resUnder5.body.items[0].first_name, 'Ana');
  assert.equal(resUnder5.body.items[0].zone_id, 2);

  // bhw2 requesting SENIOR_CITIZEN -> 0 (all seniors are in Purok 1)
  const resSeniors = await request(app)
    .get('/api/masterlists?category=SENIOR_CITIZEN')
    .set('Authorization', `Bearer ${bhw2Token}`);

  assert.equal(resSeniors.status, 200);
  assert.equal(resSeniors.body.total, 0);
  assert.equal(resSeniors.body.items.length, 0);

  // bhw2 requesting zone_id=1 -> 403 forbidden
  const resForbidden = await request(app)
    .get('/api/masterlists?category=SENIOR_CITIZEN&zone_id=1')
    .set('Authorization', `Bearer ${bhw2Token}`);

  assert.equal(resForbidden.status, 403);
  assert.equal(resForbidden.body.error.code, 'forbidden');
});

test('GET /api/masterlists fails with 400 when category is missing or invalid', async () => {
  // Missing category
  const resMissing = await request(app)
    .get('/api/masterlists')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(resMissing.status, 400);
  assert.equal(resMissing.body.error.code, 'validation_failed');

  // Invalid category
  const resInvalid = await request(app)
    .get('/api/masterlists?category=TEENAGERS')
    .set('Authorization', `Bearer ${midwifeToken}`);

  assert.equal(resInvalid.status, 400);
  assert.equal(resInvalid.body.error.code, 'validation_failed');
});

test('GET /api/masterlists fails with 403 for ADMIN (no access to resident health data)', async () => {
  const res = await request(app)
    .get('/api/masterlists?category=SENIOR_CITIZEN')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('GET /api/masterlists fails with 401 without token', async () => {
  const res = await request(app).get('/api/masterlists?category=SENIOR_CITIZEN');

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'unauthenticated');
});
