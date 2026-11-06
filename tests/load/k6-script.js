import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test for BHC System API (Step 12)
// Simulates concurrent BHC health workers querying resident profiles and masterlists.

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Baseline: 5 concurrent virtual users
    { duration: '20s', target: 15 },  // Moderate traffic: 15 virtual users
    { duration: '20s', target: 30 },  // Peak traffic: 30 virtual users
    { duration: '15s', target: 50 },  // Stress: 50 virtual users
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],    // http errors should be less than 1%
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Pre-authenticate a Midwife user to retrieve a shared token for read-heavy test
  const loginPayload = JSON.stringify({
    username: 'midwife1',
    password: 'Demo#12345',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, params);
  check(res, {
    'setup login successful': (r) => r.status === 200,
  });

  const body = JSON.parse(res.body);
  return { token: body.token };
}

export default function (data) {
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // 1. Query paginated resident directory
  const residentsRes = http.get(`${BASE_URL}/api/residents?limit=20`, authHeaders);
  check(residentsRes, {
    'residents status is 200': (r) => r.status === 200,
    'residents returns items': (r) => JSON.parse(r.body).items !== undefined,
  });

  // 2. Query residents grouped by household
  const householdResidentsRes = http.get(
    `${BASE_URL}/api/residents?group_by=household&limit=10`,
    authHeaders
  );
  check(householdResidentsRes, {
    'household residents status is 200': (r) => r.status === 200,
  });

  // 3. Query Senior Citizen masterlist
  const seniorRes = http.get(
    `${BASE_URL}/api/masterlists?category=SENIOR_CITIZEN`,
    authHeaders
  );
  check(seniorRes, {
    'senior masterlist status is 200': (r) => r.status === 200,
  });

  // 4. Query Under-Five masterlist
  const underFiveRes = http.get(
    `${BASE_URL}/api/masterlists?category=UNDER_FIVE`,
    authHeaders
  );
  check(underFiveRes, {
    'under five masterlist status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

