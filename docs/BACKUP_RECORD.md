# Backup and Restore Record

**Date:** October 31, 2026  
**System:** Barangay Health Center Resident Profiling and Masterlist System (MIS 215)  
**Database Engine:** PostgreSQL 16 (Docker) / PostgreSQL 18 (Local)  

---

## 1. Overview and Backup Scripts

Two cross-platform scripts automate regular backups and disaster recovery:
- `scripts/backup.sh` / `scripts/backup.ps1`: Creates a timestamped, clean SQL dump in `backups/` using `pg_dump`. Compatible with Docker Compose container execution (`docker compose exec -T db pg_dump ...`) and direct PostgreSQL connection.
- `scripts/restore.sh` / `scripts/restore.ps1`: Restores a chosen SQL dump (or the latest by default) into the target database using `psql`.

---

## 2. Backup Execution Test

Executed backup command:
```bash
sh scripts/backup.sh
# Or on Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
```

- **Generated Backup:** `backups/bhc_backup_20261031_121957.sql`
- **Backup Size:** 882,197 bytes (~861 KB)
- **Parameters Used:** `--clean --if-exists --no-owner --no-privileges`
- **Output Status:** Completed successfully with zero errors.

---

## 3. Restore and Data Integrity Verification Test

A fresh, isolated database `bhc_test_restore` was provisioned to test complete disaster recovery:

1. **Database Creation:**
   ```sql
   DROP DATABASE IF EXISTS bhc_test_restore;
   CREATE DATABASE bhc_test_restore;
   ```

2. **Restore Execution:**
   ```bash
   RESTORE_DB=bhc_test_restore scripts/restore.sh backups/bhc_backup_20261031_121957.sql
   ```
   Result: Completed with exit code 0.

3. **Data Integrity Checks on `bhc_test_restore`:**
   - **User Accounts (`SELECT count(*) FROM users`):** 49 rows restored (including demo accounts `admin1`, `midwife1`, `bhw1`, `bhw2`).
   - **Households (`SELECT count(*) FROM households`):** 24 households restored.
   - **Residents (`SELECT count(*) FROM residents`):** 66 resident profiles restored.
   - **Target-Group Masterlist Verification:**
     `SELECT * FROM masterlist('SENIOR_CITIZEN', NULL);` returned senior citizens with correct age calculation and risk group assignment (`SC`).
   - **Triggers and Views:** Views `v_active_residents`, functions `masterlist()`, `find_possible_duplicates()`, and audit triggers verified intact.

4. **Cleanup:**
   ```sql
   DROP DATABASE bhc_test_restore;
   ```

---

## 4. Security Checklist Review & Audit Results

Review conducted against the security checklist in `docs/CONVENTIONS.md`:

| Security Control | Status | Implementation Details |
| :--- | :---: | :--- |
| **HTTPS only (nginx)** | Pass | Port 443 is the only published port in `docker-compose.yml`. Reverse proxy terminates TLS with TLSv1.2/v1.3 protocols and security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`). |
| **Helmet middleware** | Pass | Loaded at the top of Express middleware pipeline in `api/src/app.js` (`app.use(helmet())`). |
| **Login rate limit** | Pass | `express-rate-limit` enforces a 10-attempt limit per 15 minutes per IP address in `api/src/routes/auth.js` (`rate_limited` 429 response). |
| **Bcrypt password hashing** | Pass | `bcryptjs` with salt rounds 10. Plain text passwords are never stored or logged. Password hashes are never returned by any API endpoint (`api/src/routes/users.js`). |
| **Parameterized SQL** | Pass | All queries use parameterized inputs (`$1, $2, ...`) via the `pg` driver. Zero string interpolation or SQL concatenation. Transactions run through `withTransaction` setting `app.current_user_id` for audit triggers. |
| **No secrets in git** | Pass | `.gitignore` and `.dockerignore` exclude `.env`, `certs/`, `backups/`, and `node_modules/`. |
| **No raw database errors** | Pass | Centralized error handler (`api/src/middleware/errorHandler.js`) catches PostgreSQL errors and maps them strictly by constraint name (`err.constraint`) or SQLSTATE code (`err.code`). Raw `err.detail` is never forwarded to the client. |
| **Administrator RBAC** | Pass | Role-based middleware (`api/src/middleware/requireRole.js`) strictly prevents `ADMIN` users from viewing or modifying resident health data, households, and masterlists (enforced with `403 forbidden`). |
| **BHW Zone Scoping** | Pass | BHWs can only access and modify records within their assigned purok zones (`user_zone_assignments`). Out-of-zone queries conceal existence by returning `404 not_found`. |
| **Backup and Restore** | Pass | Backup and restore scripts tested and verified with full recovery into a clean database. |

### Gaps & Recommendations
- **Automated Backup Scheduling:** In production, a cron job or scheduled task should be established to execute `scripts/backup.sh` daily with an automated retention policy (e.g., retaining 7 daily backups, 4 weekly backups).
- **Offsite Encryption:** Backup SQL files contain synthetic resident data in this academic environment; in any real-world production deployment, backups must be encrypted at rest (e.g., with GPG / AES-256) prior to off-site archival.
