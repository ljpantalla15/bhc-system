# AGENTS.md: Barangay Health Center Resident Profiling and Masterlist System

Academic project (MIS 215: Client-Server Computing, Bicol University Graduate School).
Fictional Barangay Tago Health Center, Naga City. **Synthetic data only. Never use real resident data.**

## What we are building
A three-tier web system that replaces paper forms and spreadsheets for resident profiling and masterlists.
- Tier 1, `web/`: React + Vite, served by nginx over HTTPS (port 443 is the only published port)
- Tier 2, `api/`: Node.js + Express REST API, JSON, port 3000 (internal only)
- Tier 3, `database/`: PostgreSQL 16 (internal only)
- Docker Compose runs 3 containers: `nginx`, `api`, `db`. The browser never talks to the database.

## Source of truth: read before coding
- `database/01_schema.sql`, `02_api_role.sql`, `03_demo_seed.sql`: the schema. **Never invent tables or columns.**
  If something is missing, add `database/migrations/NNN_description.sql`, say so, and update the docs.
- `docs/openapi.yaml`: the API contract (14 endpoints). If behavior changes, update this file in the same change.
- `docs/CONVENTIONS.md`: API, database, and security conventions. Follow them.
- `docs/BUILD_PLAN.md`: the step-by-step plan. Work on one step at a time.

## Roles (the API enforces them on every request)
- **BHW**: create/read/update/deactivate residents in their assigned zones only.
- **MIDWIFE**: read-only, all zones. No edits.
- **ADMIN**: manage user accounts only. **No access to resident health data.**
- **Every role** can change **their own password** (`POST /api/auth/password`, current password required).
  Username, role, zones and active status are changed by the ADMIN only.

## Hard rules
1. Never DELETE residents, households, or users. Deactivate with `is_active = false`.
2. At the start of every data-changing transaction run:
   `SELECT set_config('app.current_user_id', $1, true)` with the logged-in user's id.
   Triggers use it for `created_by`, `updated_by`, and the change log.
3. The API connects as `bhc_api` (least privilege), never as the database owner.
4. Use parameterized SQL with the `pg` package. No string-built SQL. No ORM.
5. Never return raw database error text (it can contain resident data). Map errors per `docs/CONVENTIONS.md`.
6. Passwords: bcrypt (`bcryptjs`) so the seeded demo accounts verify. Never log passwords, tokens, or hashes.
7. Never read, print, or commit `.env` or `certs/`.
8. Open-source dependencies only. Ask before adding anything beyond: express, pg, zod, jsonwebtoken, bcryptjs,
   helmet, express-rate-limit, cors (if needed), React, Vite, React Router, Vitest or Node test runner, supertest.
9. Out of scope: offline entry, SMS, integration with government systems, clinical records, real deployment.

## Commands
```bash
cp .env.example .env                       # then edit the secrets
docker compose up -d db                    # database only (runs database/*.sql on first start)
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
sh scripts/gen-cert.sh                     # self-signed HTTPS certificate into certs/
docker compose --profile app up --build -d # full stack at https://localhost
docker compose down -v                     # wipe the database volume and re-run the SQL files
cd api && npm test                         # API tests (add once the API exists)
```

## How to work
- Small steps. After each one, run it (curl, Bruno, or tests) and show the result before moving on.
- Every endpoint needs at least one success test and one failure test (401, 403, 404, or 400).
- Match `docs/openapi.yaml` exactly: paths, field names, enums, status codes, error shape.
- Keep answers short. State assumptions. Tell me when a request conflicts with the proposal or these rules.
- Demo logins (synthetic): `admin1`, `midwife1`, `bhw1` (Purok 1), `bhw2` (Purok 2 and 3). Password: `Demo#12345`.
