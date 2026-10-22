import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';

after(async () => {
  await pool.end();
});

test('GET /api/health returns 200 with { status: "ok" } when database is reachable', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('Unmatched route returns 404 in OpenAPI Error shape', async () => {
  const response = await request(app).get('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.equal(typeof response.body.error, 'object');
  assert.equal(response.body.error.code, 'not_found');
  assert.equal(response.body.error.message, 'Route not found.');
});
