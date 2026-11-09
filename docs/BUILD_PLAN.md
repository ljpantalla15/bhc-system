# Build plan (matches the work plan, Weeks 10 to 17)

Do one step at a time. Paste the prompt, let the agent work, run the checks, then move on.
Start every session with: *"Read AGENTS.md and docs/BUILD_PLAN.md. We are on Step N."*

| Step | Week | What |
| --- | --- | --- |
| 0 | 11 | Start the database |
| 1 | 11 to 12 | Scaffold the API |
| 2 | 12 to 13 | Login, logout, auth middleware |
| 3 | 12 to 13 | Roles and zone access |
| 4 | 12 to 14 | Households: create and view |
| 5 | 12 to 14 | Residents: search, update, deactivate |
| 6 | 13 to 14 | Masterlists |
| 7 | 13 to 14 | User administration |
| 8 | 14 | React client |
| 9 | 14 | Run everything over HTTPS in Docker |
| 10 | 14 to 15 | Security, backup, and restore |
| 11 | 14 to 15 | API tests (Bruno) |
| 12 | 15 to 16 | Load testing and architectural comparison |
| 13 | 16 to 17 | README, license, rehearsal, final demo |

## Step 0: Start the database
Run by hand: `cp .env.example .env`, edit the passwords, then `docker compose up -d db`.
Check: `docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM residents;"` returns 11.
Prompt: *"Check that the database started correctly: list the tables, confirm the bhc_api role exists, and run the masterlist('SENIOR_CITIZEN') function. Do not change any SQL file."*

## Step 1: Scaffold the API
Prompt: *"Create the Express API skeleton in api/ following docs/CONVENTIONS.md: package.json (ESM), config.js, db.js with the withTransaction helper, app.js with helmet and JSON parsing, the error handler that returns the Error shape from docs/openapi.yaml, and GET /api/health that runs SELECT 1. Add a test for /api/health. Connect as bhc_api using DATABASE_URL."*
Done when: `curl` on /api/health returns 200 and the test passes.

## Step 2: Login, logout, auth middleware
Prompt: *"Implement POST /api/auth/login and POST /api/auth/logout exactly as in docs/openapi.yaml, plus the auth middleware that checks the JWT and the auth_sessions row. Use bcryptjs. Add rate limiting on login. Tests: login success, wrong password 401, logout then reuse token 401, deactivated user 401."*

## Step 3: Roles and zone access
Prompt: *"Add requireRole and zone access middleware per docs/CONVENTIONS.md. Load the BHW's zone ids from user_zone_assignments. Add tests proving: ADMIN gets 403 on resident routes, and a BHW outside their zone gets 403 or 404 as specified."*

## Step 4: Households
Prompt: *"Implement POST /api/households and GET /api/households/{id}. Create the household, members, and medical conditions in one transaction via withTransaction. Validate with zod to match the OpenAPI schemas. Call find_possible_duplicates before inserting and map PostgreSQL errors per the table in docs/CONVENTIONS.md. Tests: success 201, duplicate resident 400, two heads 400, BHW wrong zone 403, Midwife read OK, Midwife create 403."*

## Step 5: Residents
Prompt: *"Implement GET /api/residents (search with q, zone_id, household_id, age_risk_group, include_inactive, pagination), PATCH /api/residents/{id}, and DELETE /api/residents/{id} (deactivate with optional reason). After a PATCH and a DELETE, verify rows appear in change_log with the right user."*

## Step 5b: Archive and restore residents (added after Step 5)
Prompt: *"Add the archive. GET /api/residents accepts status=active|archived|all (include_inactive=true stays as the older spelling of all); archived is newest deactivation first and each resident carries deactivated_at, deactivated_by_name and deactivation_reason. Add POST /api/residents/{id}/reactivate for the BHW (own zones): 404 outside the zones, 400 when already active or when restoring clashes with an active record, and a REACTIVATE row in change_log. No schema change is needed (the sync_deactivation trigger already clears the stamps). Tests: archived list, zone scoping, Midwife read, Admin 403, restore success with change_log, restore 400 and 404 and 403."*
Done when: `node --test test/archive.test.js` passes and the Residents page has an Archive view with a Restore action for BHWs.

## Step 5c: Change history on the resident record (added after Step 5b)
Prompt: *"Show who changed a resident and when, on the record itself (no separate page). Every resident carries updated_at and updated_by_name (the table shows a Last updated column). Add GET /api/residents/{id}/history for the BHW (own zones, 404 elsewhere) and the Midwife: who, when and the NAMES of the changed fields, newest first and paged, never old or new values; an archived resident keeps their history. A PATCH that changes only the medical conditions must still stamp the resident. Tests: edit appears in the history, conditions-only change, list carries updated_by_name, archived history, 404 other zone, 403 Admin, 401, 404 unknown, 400 bad id, paging."*
Done when: `node --test test/resident-history.test.js` passes, the Residents table has a Last updated column, and the resident profile has a Change history section.

## Step 6: Masterlists
Prompt: *"Implement GET /api/masterlists using the masterlist() SQL function. BHW: own zones only (403 for an unassigned zone_id). Midwife: all zones. Test all four categories against the demo data: SENIOR_CITIZEN, UNDER_FIVE, PREGNANT, PWD."*

## Step 7: User administration
Prompt: *"Implement GET /api/users, POST /api/users, PATCH /api/users/{id}. Hash passwords with bcryptjs, never return password_hash. zone_ids only for BHW accounts (the database trigger also enforces this). Deactivating a user must also revoke their open sessions."*

## Step 7b: Change own password (added after Step 7)
Prompt: *"Implement POST /api/auth/password exactly as in docs/openapi.yaml: any signed-in user changes their own password. Require current_password (bcrypt compare), new_password min 8 and different from the current one, no other fields. Update users inside withTransaction so the change is stamped and logged, then revoke the user's other auth_sessions. A wrong current password is 400 validation_failed on field current_password (not 401). Rate-limit like login. Tests: no token 401, wrong current 400 and session still valid, short 400, same as current 400, extra field 400, success 200 with other sessions revoked, old password rejected, change_log row without the hash."*
Done when: `node --test test/password.test.js` passes and the web account menu has a working Change password dialog.

## Step 8: React client
Prompt: *"In web/, build the React + Vite client: login page; role-based navigation; household encoding form that mirrors the paper Household Profiling Form (household header, then member rows with the code lists from docs/openapi.yaml); resident search and edit; masterlist page with category and zone filters and a print-friendly view; admin page for user accounts. Use the api() wrapper. Keep the UI simple and accessible."*

## Step 9: HTTPS in Docker
Run by hand: `sh scripts/gen-cert.sh`. Prompt: *"Make `docker compose --profile app up --build` work end to end: check api/Dockerfile, nginx/Dockerfile, and nginx/nginx.conf, fix any problems, and verify that only port 443 is published and the browser can log in at https://localhost."*

## Step 10: Security, backup, restore
Prompt: *"Add scripts/backup.sh (pg_dump from the db container into backups/ with a timestamp) and scripts/restore.sh. Test a full restore into a fresh database and record the result in docs/BACKUP_RECORD.md. Review the code against the security checklist in docs/CONVENTIONS.md and list any gaps."*

## Step 11: API tests
Prompt: *"Create a Bruno collection in tests/bruno/ covering all 14 endpoints from docs/openapi.yaml, each with at least one success and one failure case, using environment variables for the base URL and token."*

## Step 12: Load testing and architectural comparison
Prompt: *"Write a load test in tests/load/ (k6, Locust, or JMeter) for login then GET /api/residents and GET /api/masterlists with increasing virtual users. Run it and summarize response times and error rates in docs/LOAD_TEST.md. Then write the architectural comparison section as the proposal describes."*

## Step 13: Final deliverables
Prompt: *"Write the final README (setup, demo accounts, architecture diagram, how to run tests), add a LICENSE file, and check that the privacy notes in docs match what the code does."*
