import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { pool } from '../src/db.js';
import { requireAuth } from '../src/middleware/auth.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { requireZoneAccess, assertRecordZoneAccess } from '../src/middleware/zoneAccess.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { app } from '../src/app.js';

let adminToken;
let midwifeToken;
let bhw1Token; // assigned to Purok 1 (zone_id: 1)
let bhw2Token; // assigned to Purok 2 & 3 (zone_ids: [2, 3])

// Create a test app using the middlewares to test route protections
const testApp = express();
testApp.use(express.json());

// 1. Resident read route: accessible to BHW and MIDWIFE only (ADMIN gets 403)
testApp.get('/test/residents', requireAuth, requireRole('BHW', 'MIDWIFE'), (req, res) => {
  res.json({ message: 'Resident list' });
});

// 2. Household create route: accessible to BHW only (MIDWIFE and ADMIN get 403)
testApp.post(
  '/test/households',
  requireAuth,
  requireRole('BHW'),
  requireZoneAccess((req) => req.body.zone_id),
  (req, res) => {
    res.json({ message: 'Household created', zone_id: req.body.zone_id });
  }
);

// 3. Record access by ID: BHW outside zone gets 404; Midwife gets 200
testApp.get('/test/records/:id', requireAuth, requireRole('BHW', 'MIDWIFE'), (req, res, next) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    // Simulated DB record: ID 1 is in Zone 1; ID 2 is in Zone 2
    const fakeRecords = {
      1: { id: 1, zone_id: 1, name: 'Record in Zone 1' },
      2: { id: 2, zone_id: 2, name: 'Record in Zone 2' },
    };
    const rec = fakeRecords[recordId];
    if (!rec) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Record not found.' } });
    }

    assertRecordZoneAccess(req.user, rec.zone_id, 'Record');
    res.json(rec);
  } catch (err) {
    next(err);
  }
});

testApp.use(errorHandler);

before(async () => {
  // Login to acquire real tokens for all roles
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  adminToken = await login('admin1');
  midwifeToken = await login('midwife1');
  bhw1Token = await login('bhw1');
  bhw2Token = await login('bhw2');
});

after(async () => {
  await pool.end();
});

test('ADMIN gets 403 on resident routes (no access to resident health data)', async () => {
  const res = await request(testApp)
    .get('/test/residents')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
});

test('MIDWIFE gets 200 on read routes and 403 on BHW-only create routes', async () => {
  // Read route: OK
  const readRes = await request(testApp)
    .get('/test/residents')
    .set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(readRes.status, 200);

  // Write route: 403
  const writeRes = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ zone_id: 1 });
  assert.equal(writeRes.status, 403);
  assert.equal(writeRes.body.error.code, 'forbidden');
});

test('BHW gets 200 when accessing assigned zone (Purok 1 for bhw1)', async () => {
  const res = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({ zone_id: 1 });

  assert.equal(res.status, 200);
  assert.equal(res.body.zone_id, 1);
});

test('BHW gets 403 when requesting an unassigned zone (Purok 2 for bhw1)', async () => {
  const res = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({ zone_id: 2 });

  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'forbidden');
  assert.equal(res.body.error.message, 'You do not have access to this zone.');
});

test('BHW gets 200 viewing a record in their own zone (Record 1 in Zone 1 for bhw1)', async () => {
  const res = await request(testApp)
    .get('/test/records/1')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, 1);
});

test('BHW gets 404 concealing existence when viewing a record outside their zone (Record 2 in Zone 2 for bhw1)', async () => {
  const res = await request(testApp)
    .get('/test/records/2')
    .set('Authorization', `Bearer ${bhw1Token}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
  assert.equal(res.body.error.message, 'Record not found.');
});

test('MIDWIFE gets 200 viewing records across all zones (Zone 1 and Zone 2)', async () => {
  const res1 = await request(testApp)
    .get('/test/records/1')
    .set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(res1.status, 200);

  const res2 = await request(testApp)
    .get('/test/records/2')
    .set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(res2.status, 200);
});

test('bhw2 (assigned to Purok 2 and 3) gets 200 on Zone 2 and 403 on Zone 1', async () => {
  // Zone 2 -> OK
  const resZone2 = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${bhw2Token}`)
    .send({ zone_id: 2 });
  assert.equal(resZone2.status, 200);

  // Zone 3 -> OK
  const resZone3 = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${bhw2Token}`)
    .send({ zone_id: 3 });
  assert.equal(resZone3.status, 200);

  // Zone 1 -> 403
  const resZone1 = await request(testApp)
    .post('/test/households')
    .set('Authorization', `Bearer ${bhw2Token}`)
    .send({ zone_id: 1 });
  assert.equal(resZone1.status, 403);
  assert.equal(resZone1.body.error.code, 'forbidden');
});
