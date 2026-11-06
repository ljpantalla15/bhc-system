import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool, query } from '../src/db.js';

let bhw1Token;
let midwifeToken;
let adminToken;
let createdHouseholdId;
let createdResidentId;
let createdUserId;

before(async () => {
  const login = async (username) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'Demo#12345' });
    return res.body.token;
  };

  bhw1Token = await login('bhw1');
  midwifeToken = await login('midwife1');
  adminToken = await login('admin1');
});

after(async () => {
  if (createdHouseholdId) {
    await query('UPDATE households SET is_active = false WHERE id = $1', [createdHouseholdId]);
    await query('UPDATE residents SET is_active = false WHERE household_id = $1', [createdHouseholdId]);
  }
  if (createdUserId) {
    await query('UPDATE users SET is_active = false WHERE id = $1', [createdUserId]);
  }
  await pool.end();
});

test('Bruno 01-Auth: Login success (BHW1, Admin, Midwife) and failures (401, 400)', async () => {
  // 01-login-bhw1-success
  const resBhw = await request(app).post('/api/auth/login').send({ username: 'bhw1', password: 'Demo#12345' });
  assert.equal(resBhw.status, 200);
  assert.equal(resBhw.body.user.role, 'BHW');

  // 02-login-admin-success
  const resAdmin = await request(app).post('/api/auth/login').send({ username: 'admin1', password: 'Demo#12345' });
  assert.equal(resAdmin.status, 200);
  assert.equal(resAdmin.body.user.role, 'ADMIN');

  // 03-login-midwife-success
  const resMidwife = await request(app).post('/api/auth/login').send({ username: 'midwife1', password: 'Demo#12345' });
  assert.equal(resMidwife.status, 200);
  assert.equal(resMidwife.body.user.role, 'MIDWIFE');

  // 04-login-invalid-credentials
  const resInvalid = await request(app).post('/api/auth/login').send({ username: 'bhw1', password: 'WrongPassword!999' });
  assert.equal(resInvalid.status, 401);
  assert.equal(resInvalid.body.error.code, 'invalid_credentials');

  // 05-login-short-username
  const resShort = await request(app).post('/api/auth/login').send({ username: 'ab', password: 'Password123' });
  assert.equal(resShort.status, 400);
  assert.equal(resShort.body.error.code, 'validation_failed');
});

test('Bruno 01-Auth: Logout success and unauthenticated failure', async () => {
  // Fresh login for logout test
  const loginRes = await request(app).post('/api/auth/login').send({ username: 'bhw2', password: 'Demo#12345' });
  const tempToken = loginRes.body.token;

  // 06-logout-success
  const resLogout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${tempToken}`);
  assert.equal(resLogout.status, 200);
  assert.equal(resLogout.body.message, 'Session ended.');

  // 07-logout-unauthenticated
  const resUnauth = await request(app).post('/api/auth/logout');
  assert.equal(resUnauth.status, 401);
  assert.equal(resUnauth.body.error.code, 'unauthenticated');
});

test('Bruno 02-Households: Create household (201, 403, 400) and Get household (200, 404)', async () => {
  const rand = Math.floor(10000 + Math.random() * 89999);
  const randF = Math.floor(10000 + Math.random() * 89999);
  const randD = Math.floor(10000 + Math.random() * 89999);
  // 01-create-household-success
  const resCreate = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({
      household_no: `202611-TAGO-${rand}`,
      date_of_visit: '2026-11-01',
      zone_id: 1,
      water_source_code: 'LV3',
      toilet_facility_code: 'P',
      is_4ps_household: false,
      members: [
        {
          last_name: `BrunoTest${rand}`,
          first_name: 'Carlos',
          relation_to_head: 'HEAD',
          birth_date: '1982-05-14',
          sex: 'M',
          civil_status_code: 'M',
          education_code: 'CG',
          religion_code: 'RC',
        },
      ],
    });
  assert.equal(resCreate.status, 201);
  createdHouseholdId = resCreate.body.id;
  createdResidentId = resCreate.body.members[0].id;

  // 02-create-household-forbidden-zone
  const resForbid = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({
      household_no: `202611-TAGO-${randF}`,
      date_of_visit: '2026-11-01',
      zone_id: 2,
      members: [{ last_name: 'Test', first_name: 'X', relation_to_head: 'HEAD', birth_date: '1990-01-01', sex: 'M', civil_status_code: 'S', education_code: 'HG' }],
    });
  assert.equal(resForbid.status, 403);
  assert.equal(resForbid.body.error.code, 'forbidden');

  // 03-create-household-duplicate-resident
  const resDup = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({
      household_no: `202611-TAGO-${randD}`,
      date_of_visit: '2026-11-01',
      zone_id: 1,
      members: [{ last_name: 'Reyes', first_name: 'Antonio', relation_to_head: 'HEAD', birth_date: '1958-07-16', sex: 'M', civil_status_code: 'M', education_code: 'HG' }],
    });
  assert.equal(resDup.status, 400);
  assert.equal(resDup.body.error.code, 'duplicate_resident');

  // 04-get-household-success
  const resGet = await request(app).get('/api/households/1').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resGet.status, 200);
  assert.equal(resGet.body.id, 1);

  // 05-get-household-not-found
  const resNotFound = await request(app).get('/api/households/999999').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resNotFound.status, 404);

  // 06-get-household-out-of-zone
  const resOutOfZone = await request(app).get('/api/households/3').set('Authorization', `Bearer ${bhw1Token}`);
  assert.equal(resOutOfZone.status, 404);
});

test('Bruno 03-Residents: Search (200, 403, 400), Update (200, 403, 404), Deactivate (200, 403, 404)', async () => {
  // 01-search-residents-success
  const resSearch = await request(app).get('/api/residents?q=Reyes&page=1&page_size=10').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resSearch.status, 200);
  assert.ok(resSearch.body.total >= 1);

  // 02-search-residents-forbidden-admin
  const resAdminForbid = await request(app).get('/api/residents').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(resAdminForbid.status, 403);

  // 03-search-residents-invalid-params
  const resInvalid = await request(app).get('/api/residents?age_risk_group=INVALID').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resInvalid.status, 400);

  // 04-update-resident-success
  const resUpdate = await request(app)
    .patch('/api/residents/1')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({ occupation: 'Master Carpenter' });
  assert.equal(resUpdate.status, 200);
  assert.equal(resUpdate.body.occupation, 'Master Carpenter');

  // 05-update-resident-forbidden-midwife
  const resMidwifeUpdate = await request(app)
    .patch('/api/residents/1')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ occupation: 'Doctor' });
  assert.equal(resMidwifeUpdate.status, 403);

  // 06-update-resident-not-found
  const resUpdate404 = await request(app)
    .patch('/api/residents/999999')
    .set('Authorization', `Bearer ${bhw1Token}`)
    .send({ occupation: 'Technician' });
  assert.equal(resUpdate404.status, 404);

  // 07-deactivate-resident-forbidden-midwife
  const resMidwifeDel = await request(app).delete('/api/residents/1').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resMidwifeDel.status, 403);

  // 08-deactivate-resident-not-found
  const resDel404 = await request(app).delete('/api/residents/999999').set('Authorization', `Bearer ${bhw1Token}`);
  assert.equal(resDel404.status, 404);

  // 09-deactivate-resident-success (deactivate created resident)
  if (createdResidentId) {
    const resDeact = await request(app)
      .delete(`/api/residents/${createdResidentId}?reason=Relocated`)
      .set('Authorization', `Bearer ${bhw1Token}`);
    assert.equal(resDeact.status, 200);
    assert.equal(resDeact.body.is_active, false);
  }
});

test('Bruno 04-Masterlists: (200 for all 4 categories, 400 missing, 403 admin)', async () => {
  // 01-masterlist-senior-citizen-success
  const resSC = await request(app).get('/api/masterlists?category=SENIOR_CITIZEN').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resSC.status, 200);
  assert.equal(resSC.body.category, 'SENIOR_CITIZEN');

  // 02-masterlist-under-five-success
  const resU5 = await request(app).get('/api/masterlists?category=UNDER_FIVE').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resU5.status, 200);
  assert.equal(resU5.body.category, 'UNDER_FIVE');

  // 03-masterlist-pregnant-success
  const resPreg = await request(app).get('/api/masterlists?category=PREGNANT').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resPreg.status, 200);
  assert.equal(resPreg.body.category, 'PREGNANT');

  // 04-masterlist-pwd-success
  const resPWD = await request(app).get('/api/masterlists?category=PWD').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resPWD.status, 200);
  assert.equal(resPWD.body.category, 'PWD');

  // 05-masterlist-missing-category
  const resMissing = await request(app).get('/api/masterlists').set('Authorization', `Bearer ${midwifeToken}`);
  assert.equal(resMissing.status, 400);

  // 06-masterlist-admin-forbidden
  const resAdminForbid = await request(app).get('/api/masterlists?category=SENIOR_CITIZEN').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(resAdminForbid.status, 403);
});

test('Bruno 05-Users: List (200, 403), Create (201, 400), Update (200, 404)', async () => {
  // 01-list-users-success
  const resList = await request(app).get('/api/users?page=1&page_size=10').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(resList.status, 200);
  assert.ok(resList.body.total >= 4);
  for (const u of resList.body.items) {
    assert.equal(u.password, undefined);
    assert.equal(u.password_hash, undefined);
  }

  // 02-list-users-forbidden-bhw
  const resBhwForbid = await request(app).get('/api/users').set('Authorization', `Bearer ${bhw1Token}`);
  assert.equal(resBhwForbid.status, 403);

  // 03-create-user-success
  const rand = Math.floor(10000 + Math.random() * 89999);
  const resCreate = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username: `bhw_bruno_${rand}`,
      password: 'Password123!',
      full_name: 'Bruno Worker',
      role: 'BHW',
      zone_ids: [1],
    });
  assert.equal(resCreate.status, 201);
  createdUserId = resCreate.body.id;

  // 04-create-user-validation-failed
  const resBadCreate = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username: `mw_bad_${rand}`,
      password: 'Password123!',
      full_name: 'Bad Midwife',
      role: 'MIDWIFE',
      zone_ids: [1],
    });
  assert.equal(resBadCreate.status, 400);

  // 05-update-user-success
  const resUpdate = await request(app)
    .patch(`/api/users/${createdUserId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ full_name: 'Updated Bruno Worker' });
  assert.equal(resUpdate.status, 200);
  assert.equal(resUpdate.body.full_name, 'Updated Bruno Worker');

  // 06-update-user-not-found
  const resUpdate404 = await request(app)
    .patch('/api/users/999999')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ full_name: 'Ghost' });
  assert.equal(resUpdate404.status, 404);
});

test('Bruno 06-Account: change own password (401, 400, 200) and restore the demo password', async () => {
  // 01-change-password-unauthenticated
  const resNoAuth = await request(app)
    .post('/api/auth/password')
    .send({ current_password: 'Demo#12345', new_password: 'Temp#12345' });
  assert.equal(resNoAuth.status, 401);
  assert.equal(resNoAuth.body.error.code, 'unauthenticated');

  // 02-change-password-wrong-current
  const resWrong = await request(app)
    .post('/api/auth/password')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ current_password: 'Wrong#00000', new_password: 'Temp#12345' });
  assert.equal(resWrong.status, 400);
  assert.equal(resWrong.body.error.details[0].field, 'current_password');

  // 03-change-password-success
  const resOk = await request(app)
    .post('/api/auth/password')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ current_password: 'Demo#12345', new_password: 'Temp#12345' });
  assert.equal(resOk.status, 200);
  assert.equal(resOk.body.message, 'Password changed.');

  // 04-change-password-restore
  const resRestore = await request(app)
    .post('/api/auth/password')
    .set('Authorization', `Bearer ${midwifeToken}`)
    .send({ current_password: 'Temp#12345', new_password: 'Demo#12345' });
  assert.equal(resRestore.status, 200);

  const relogin = await request(app).post('/api/auth/login').send({ username: 'midwife1', password: 'Demo#12345' });
  assert.equal(relogin.status, 200);
});
