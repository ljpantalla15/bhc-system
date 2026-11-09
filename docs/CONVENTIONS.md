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
- `POST /api/auth/password`: any signed-in user changes their own password. Check `current_password` with
  bcrypt, hash `new_password` (min 8, must differ), update `users` inside `withTransaction`, then revoke the
  user's other sessions (`id <> current session`). Rate-limit it like login.
  A wrong current password is **400 `validation_failed`** (field `current_password`), not 401, because
  the client signs the user out on any 401.
- Same 401 message for wrong username and wrong password. Rate-limit login (express-rate-limit).

## Authorization
- `requireRole('BHW', ...)` per route, as listed in `docs/openapi.yaml` ("Access" lines).
- BHW zones come from `user_zone_assignments`. Load them once per request.
- BHW asks for a record outside their zones: **404**. BHW asks for a zone they do not have: **403**.
- Midwife passes `NULL` zone ids to `masterlist()`; a BHW passes their zone id array.
- Resident change history (`GET /api/residents/{id}/history`): same access as reading the resident (BHW own zones, outside them 404;
  Midwife all zones; Admin 403). Return who, when and the field **names** only, never `old_data` / `new_data`. Join `users` for the
  name; never forward row values. Every resident also carries `updated_at` and `updated_by_name` for the "Last updated" column.

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
| Wrong current password on `POST /api/auth/password` | 400 | validation_failed (field `current_password`) |
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
- Restore (reactivate): `UPDATE ... SET is_active = true` (the trigger clears the stamps and the log row is `REACTIVATE`).
  The archive is `GET /api/residents?status=archived`, newest deactivation first, same zone scoping as the active list.
  A restore that clashes with an active record (duplicate, second head, PhilHealth ID) maps through the constraint table to 400.
- Age and age risk group are calculated by the view. Do not store or accept them.

## Frontend
- React + Vite + React Router. Keep the token in memory (React state); `sessionStorage` is acceptable for the demo.
- One `api()` fetch wrapper adds the `Authorization` header and turns the error shape into readable messages.
- Show only the screens the role may use. The API still enforces access.
- Household encoding form mirrors the paper Household Profiling Form: household header, then one row per member.

## Security and Privacy checklist
- **HTTPS Only**: Nginx TLS reverse proxy; only port 443 is published externally.
- **Helmet**: Secures HTTP response headers with standard security practices.
- **Authentication**: Login rate limit (10 attempts / 15 min per IP), bcrypt password hashing (cost factor 10), stateful server sessions (`auth_sessions`) paired with signed JWTs.
- **Self-service password change**: requires the current password, has the same rate limit as login, revokes the user's other sessions, and is written to `change_log` without the hash (the `log_change()` trigger strips `password_hash`).
- **Principle of Least Privilege**:
  - API connects to PostgreSQL as `bhc_api`, not the database owner.
  - Administrator role (`ADMIN`) is strictly prohibited from accessing resident health records, households, or masterlists (returns 403 Forbidden).
  - Barangay Health Worker (`BHW`) is scoped exclusively to assigned puroks; unauthorized zone requests return 403, and unassigned records return 404 (concealing existence).
  - Midwife (`MIDWIFE`) has read-only access across all zones; cannot create, modify, or deactivate records.
- **Data Protection**: Parameterized SQL via `pg` (no string-built queries), no raw database errors or stack traces leaked to clients (`errorHandler.js`), never return password hashes.
- **Audit Logging**: Every transaction sets `app.current_user_id` inside `withTransaction`, logging inserts, updates, deactivations, and reactivations (restores) to `change_log`. A resident's log is readable through `GET /api/residents/{id}/history` (names of changed fields only).
- **Privacy & Statutory Compliance**: Synthetic data only; full statutory review in `docs/PRIVACY.md`.
- **Operational Recovery**: Automated backup scripts (`scripts/backup.sh`, `scripts/backup.ps1`) and validated restore procedures (`docs/BACKUP_RECORD.md`).
