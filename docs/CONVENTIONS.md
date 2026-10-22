# Conventions

## Layout (target)
```
api/src/
  server.js            # starts the app
  app.js               # express app, middleware, routes
  config.js            # reads environment variables
  db.js                # pg Pool + withTransaction(user, fn) helper
  middleware/          # auth.js, requireRole.js, zoneAccess.js, validate.js, errorHandler.js
  routes/              # auth.js, households.js, residents.js, masterlists.js, users.js
  schemas/             # zod schemas matching docs/openapi.yaml
web/src/               # React app: pages/, components/, api/ (fetch wrapper), auth/
tests/bruno/           # Bruno collection (API tests)
tests/load/            # load test scripts
```

## Transactions
Every write goes through one helper so the audit context is never forgotten:
```js
async function withTransaction(user, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(user.id)]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
```

## Authentication
- `POST /api/auth/login`: check bcrypt hash and `is_active`, insert an `auth_sessions` row,
  sign a JWT whose `jti` is the session id, `sub` the user id, with the same expiry.
- Every protected request: verify the JWT, then check the session row exists, is not revoked, and is not expired.
- `POST /api/auth/logout`: set `revoked_at = now()` on the session.
- Same 401 message for wrong username and wrong password. Rate-limit login (express-rate-limit).

## Authorization
- `requireRole('BHW', ...)` per route, as listed in `docs/openapi.yaml` ("Access" lines).
- BHW zones come from `user_zone_assignments`. Load them once per request.
- BHW asks for a record outside their zones: **404**. BHW asks for a zone they do not have: **403**.
- Midwife passes `NULL` zone ids to `masterlist()`; a BHW passes their zone id array.

## Error shape and status codes (200, 201, 400, 401, 403, 404, 500)
```json
{ "error": { "code": "validation_failed", "message": "...", "details": [{ "field": "...", "issue": "..." }] } }
```
| Situation | Status | error.code |
| --- | --- | --- |
| zod validation fails | 400 | validation_failed |
| PostgreSQL 23505 on `residents_no_exact_duplicate_uq` | 400 | duplicate_resident |
| PostgreSQL 23505 on `residents_one_head_per_household_uq` | 400 | validation_failed (one head per household) |
| PostgreSQL 23505 on `residents_philhealth_id_uq` | 400 | validation_failed (PhilHealth ID already used) |
| PostgreSQL 23505 on `users_username_uq` | 400 | validation_failed (username taken) |
| PostgreSQL 23514, 23503, 22023 | 400 | validation_failed |
| Wrong credentials | 401 | invalid_credentials |
| Missing, expired, or revoked token | 401 | unauthenticated |
| Wrong role, or zone not assigned | 403 | forbidden |
| Not found or outside the BHW's zones | 404 | not_found |
| Anything else | 500 | internal_error (log the real error server-side, return no details) |

Map by constraint name (`err.constraint`), never by message text, and never forward `err.detail`.

## Database use
- Search residents with `v_active_residents`; masterlists with `SELECT * FROM masterlist($1, $2)`.
- Before inserting a resident, call `find_possible_duplicates()` and return possible matches in `details`.
- Create household + members + medical conditions in ONE transaction.
- Replace medical conditions on update by deleting that resident's rows and inserting the new set.
- Deactivate: `UPDATE ... SET is_active = false` (the trigger stamps who and when).
- Age and age risk group are calculated by the view. Do not store or accept them.

## Frontend
- React + Vite + React Router. Keep the token in memory (React state); `sessionStorage` is acceptable for the demo.
- One `api()` fetch wrapper adds the `Authorization` header and turns the error shape into readable messages.
- Show only the screens the role may use. The API still enforces access.
- Household encoding form mirrors the paper Household Profiling Form: household header, then one row per member.

## Security checklist
HTTPS only (nginx), `helmet`, login rate limit, bcrypt, parameterized SQL, no secrets in git, no raw DB errors,
Administrator cannot reach resident endpoints, backups documented and restore tested.
