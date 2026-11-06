# BHC System Load Testing Suite

This directory contains load and stress testing scripts for the **Barangay Health Center Resident Profiling and Masterlist System** (MIS 215: Client-Server Computing).

## Test Scripts Included

1. **`runner.js` (Native Node.js Test Runner)**
   - Zero external load-test dependencies required (uses native Node.js fetch and performance APIs).
   - Can dynamically launch an in-process test server or benchmark an existing URL (`http://localhost:3000` or `https://localhost`).
   - Simulates 5, 15, 30, and 50 concurrent Virtual Users (VUs) executing health worker workflows: authentication, resident directory queries, household grouped queries, and target masterlists.

2. **`k6-script.js` (Grafana k6)**
   - Industry-standard k6 load testing script with multi-stage ramping and response latency thresholds.

3. **`locustfile.py` (Python Locust)**
   - Python-based load testing scenario with weighted user tasks and session state.

---

## Running the Tests

### Option A: Native Node.js Runner (Recommended & Out-of-the-Box)

From the project root or `api/` directory:

```bash
# Run against the local API service
npm --prefix api run load-test

# Or run directly via node targeting an external or docker URL
node tests/load/runner.js
# Or target a specific host
BASE_URL=http://localhost:3000 node tests/load/runner.js
```

### Option B: k6

Prerequisite: [k6](https://k6.io/) installed.

```bash
# Run k6 against local or Docker instance
k6 run tests/load/k6-script.js

# Or provide custom base URL
k6 run -e BASE_URL=https://localhost tests/load/k6-script.js
```

### Option C: Locust

Prerequisite: Python 3 and `pip install locust`.

```bash
# Start Locust web interface on http://localhost:8089
locust -f tests/load/locustfile.py --host http://localhost:3000

# Or run headless with 50 users, spawn rate 5/s for 1 minute:
locust -f tests/load/locustfile.py --host http://localhost:3000 --headless -u 50 -r 5 --run-time 1m
```

---

## Detailed Report

See [docs/LOAD_TEST.md](../../docs/LOAD_TEST.md) for full empirical benchmark results, latency quantiles, endpoint breakdown, and the complete Client-Server Architectural Comparison.

