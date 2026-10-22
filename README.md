# Barangay Health Center Resident Profiling and Masterlist System

MIS 215: Client-Server Computing, Bicol University Graduate School. Fictional Barangay Tago Health Center, Naga City. Synthetic data only.

React + Express + PostgreSQL behind nginx, run with Docker Compose.

## 1. Prerequisites
- Docker Desktop (on Windows: with the WSL2 backend), Git, Node.js 20+
- OpenCode and/or Antigravity (see below)

## 2. First run
```bash
cp .env.example .env          # edit the passwords and secret
docker compose up -d db       # creates the database from database/*.sql
docker compose exec db psql -U bhc_owner -d bhc -c "SELECT count(*) FROM residents;"   # expect 11
```
To reset the database: `docker compose down -v`, then start it again.

The full app (after the API and web client exist):
```bash
sh scripts/gen-cert.sh
docker compose --profile app up --build -d      # https://localhost
```

## 3. Demo accounts (synthetic)
`admin1`, `midwife1`, `bhw1` (Purok 1), `bhw2` (Purok 2 and 3). Password: `Demo#12345`.

## 4. Using OpenCode
1. Install OpenCode following opencode.ai, then run `opencode` in this folder.
2. It reads `AGENTS.md` automatically, and `opencode.json` adds `docs/CONVENTIONS.md` and `docs/BUILD_PLAN.md`. You do not need `/init`.
3. First message: *Read AGENTS.md and docs/BUILD_PLAN.md. We are on Step 1.*

## 5. Using Antigravity
1. Open this folder as the workspace.
2. Antigravity reads `AGENTS.md` from the project root, and `.agents/rules/project.md` points to it. Open the Rules panel to confirm both are active; if your version shows a different rules folder, add the same text there.
3. First message: *Read AGENTS.md and docs/BUILD_PLAN.md. We are on Step 1.*

## 6. Folders
| Path | Purpose |
| --- | --- |
| `database/` | Schema, API role, demo data, first-start password script, `migrations/` for later changes |
| `docs/` | `openapi.yaml` (API contract), `CONVENTIONS.md`, `BUILD_PLAN.md` (add `DATA_DICTIONARY.md` exported from the ERD doc) |
| `api/` | Express API (built in Steps 1 to 7) |
| `web/` | React + Vite client (Step 8) |
| `nginx/` | HTTPS reverse proxy config and Dockerfile |
| `tests/` | Bruno collection and load tests |
| `scripts/`, `backups/` | Certificate, backup and restore scripts; backup output |
