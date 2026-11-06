import { performance } from 'node:perf_hooks';
import http from 'node:http';
import { app } from '../../api/src/app.js';
import { pool } from '../../api/src/db.js';

// Configuration
const CONFIG = {
  stages: [
    { name: 'Baseline (5 VUs)', vus: 5, iterationsPerVu: 15 },
    { name: 'Moderate (15 VUs)', vus: 15, iterationsPerVu: 15 },
    { name: 'Peak (30 VUs)', vus: 30, iterationsPerVu: 15 },
    { name: 'Stress (50 VUs)', vus: 50, iterationsPerVu: 15 },
  ],
  credentials: [
    { username: 'midwife1', password: 'Demo#12345' },
    { username: 'bhw1', password: 'Demo#12345' },
    { username: 'bhw2', password: 'Demo#12345' },
  ],
};

function calculateStats(latencies) {
  if (latencies.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const getPercentile = (p) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
  };

  return {
    count: sorted.length,
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    mean: Number((sum / sorted.length).toFixed(2)),
    p50: Number(getPercentile(50).toFixed(2)),
    p90: Number(getPercentile(90).toFixed(2)),
    p95: Number(getPercentile(95).toFixed(2)),
    p99: Number(getPercentile(99).toFixed(2)),
  };
}

async function obtainAuthTokens(baseUrl) {
  const tokens = {};
  for (const cred of CONFIG.credentials) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    });
    if (!res.ok) {
      throw new Error(`Failed to login as ${cred.username}: status ${res.status}`);
    }
    const data = await res.json();
    tokens[cred.username] = data.token;
  }
  return tokens;
}

async function runStage(baseUrl, stage, tokens) {
  console.log(`\n======================================================`);
  console.log(`Starting Stage: ${stage.name} (${stage.vus} concurrent VUs, ${stage.iterationsPerVu} iters/VU)`);
  console.log(`======================================================`);

  const stageStart = performance.now();
  const allResults = [];
  const endpointResults = new Map();

  const recordResult = (endpoint, method, status, duration) => {
    const entry = { endpoint, method, status, duration };
    allResults.push(entry);

    const key = `${method} ${endpoint}`;
    if (!endpointResults.has(key)) {
      endpointResults.set(key, { successes: 0, failures: 0, latencies: [] });
    }
    const epData = endpointResults.get(key);
    if (status >= 200 && status < 400) {
      epData.successes++;
    } else {
      epData.failures++;
    }
    epData.latencies.push(duration);
  };

  // Virtual User worker routine simulating realistic health center staff workflow
  const runVirtualUser = async (vuId) => {
    const cred = CONFIG.credentials[vuId % CONFIG.credentials.length];
    const token = tokens[cred.username];

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const workload = [
      { method: 'GET', endpoint: '/api/residents?limit=20' },
      { method: 'GET', endpoint: '/api/residents?group_by=household&limit=10' },
      { method: 'GET', endpoint: '/api/masterlists?category=SENIOR_CITIZEN' },
      { method: 'GET', endpoint: '/api/masterlists?category=UNDER_FIVE' },
    ];

    for (let iter = 0; iter < stage.iterationsPerVu; iter++) {
      for (const item of workload) {
        const reqStart = performance.now();
        try {
          const res = await fetch(`${baseUrl}${item.endpoint}`, {
            method: item.method,
            headers: authHeaders,
          });
          await res.text();
          const reqDuration = performance.now() - reqStart;
          recordResult(item.endpoint, item.method, res.status, reqDuration);
        } catch (err) {
          const reqDuration = performance.now() - reqStart;
          recordResult(item.endpoint, item.method, 0, reqDuration);
        }
      }
    }
  };

  // Launch all VUs concurrently
  const vuPromises = [];
  for (let i = 0; i < stage.vus; i++) {
    vuPromises.push(runVirtualUser(i));
  }
  await Promise.all(vuPromises);

  const stageDurationMs = performance.now() - stageStart;
  const totalRequests = allResults.length;
  const successfulRequests = allResults.filter((r) => r.status >= 200 && r.status < 400).length;
  const failedRequests = totalRequests - successfulRequests;
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);
  const rps = ((totalRequests / stageDurationMs) * 1000).toFixed(2);
  const allLatencies = allResults.map((r) => r.duration);
  const overallStats = calculateStats(allLatencies);

  console.log(`Results for ${stage.name}:`);
  console.log(`  Total Requests:    ${totalRequests}`);
  console.log(`  Successful:        ${successfulRequests}`);
  console.log(`  Failed:            ${failedRequests} (${errorRate}% error rate)`);
  console.log(`  Duration:          ${(stageDurationMs / 1000).toFixed(2)}s`);
  console.log(`  Throughput:        ${rps} req/sec`);
  console.log(`  Latencies (ms):    min=${overallStats.min}, mean=${overallStats.mean}, p50=${overallStats.p50}, p90=${overallStats.p90}, p95=${overallStats.p95}, p99=${overallStats.p99}, max=${overallStats.max}`);

  console.log(`\n  Endpoint Breakdown:`);
  const endpointSummary = [];
  for (const [key, val] of endpointResults.entries()) {
    const epStats = calculateStats(val.latencies);
    endpointSummary.push({
      Endpoint: key,
      Reqs: val.latencies.length,
      Failures: val.failures,
      'Mean (ms)': epStats.mean,
      'p50 (ms)': epStats.p50,
      'p95 (ms)': epStats.p95,
      'p99 (ms)': epStats.p99,
    });
  }
  console.table(endpointSummary);

  return {
    stage: stage.name,
    vus: stage.vus,
    totalRequests,
    successfulRequests,
    failedRequests,
    errorRate: Number(errorRate),
    durationSeconds: Number((stageDurationMs / 1000).toFixed(2)),
    rps: Number(rps),
    stats: overallStats,
    endpoints: endpointSummary,
  };
}

async function runLoginBenchmark(baseUrl) {
  console.log(`\n======================================================`);
  console.log(`Running Dedicated Login / Authentication Benchmark`);
  console.log(`======================================================`);

  const loginLatencies = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const cred = CONFIG.credentials[i % CONFIG.credentials.length];
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      await res.json();
      loginLatencies.push(performance.now() - start);
    } catch (err) {
      loginLatencies.push(performance.now() - start);
    }
  }

  const stats = calculateStats(loginLatencies);
  console.log(`Login Endpoint Performance (Bcrypt cost factor 10 + JWT + Session Row):`);
  console.log(`  Samples: ${stats.count}, Mean: ${stats.mean}ms, p50: ${stats.p50}ms, p95: ${stats.p95}ms, max: ${stats.max}ms`);
  return stats;
}

async function main() {
  console.log('--- BHC System Load Testing Suite (Node Runner) ---');
  let server = null;
  let targetUrl = process.env.BASE_URL;

  if (!targetUrl) {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    targetUrl = `http://localhost:${port}`;
    console.log(`Started in-memory test server at ${targetUrl}`);
  } else {
    console.log(`Targeting running server at ${targetUrl}`);
  }

  const stageResults = [];

  try {
    console.log('Authenticating simulated BHC staff...');
    const tokens = await obtainAuthTokens(targetUrl);
    console.log('Authentication tokens retrieved successfully.');

    // 1. Measure login benchmark (within rate limit)
    const loginStats = await runLoginBenchmark(targetUrl);

    // 2. Run concurrency stages
    for (const stage of CONFIG.stages) {
      const res = await runStage(targetUrl, stage, tokens);
      stageResults.push(res);
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log('\n======================================================');
    console.log('LOAD TEST SUMMARY TABLE ACROSS ALL VIRTUAL USER TIERS');
    console.log('======================================================');
    const summaryTable = stageResults.map((r) => ({
      'Virtual Users': r.vus,
      'Total Requests': r.totalRequests,
      'Throughput (req/s)': r.rps,
      'Error Rate (%)': `${r.errorRate}%`,
      'Mean Latency (ms)': r.stats.mean,
      'p50 (ms)': r.stats.p50,
      'p95 (ms)': r.stats.p95,
      'p99 (ms)': r.stats.p99,
    }));
    console.table(summaryTable);

    console.log('\nJSON_METRICS_START');
    console.log(JSON.stringify({ loginStats, stages: stageResults }, null, 2));
    console.log('JSON_METRICS_END');
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal load test runner error:', err);
  process.exit(1);
});
