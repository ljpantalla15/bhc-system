# Data Privacy and Security Statement

**Project**: Barangay Health Center Resident Profiling and Masterlist System  
**Academic Program**: Master in Information Systems (MIS 215: Client-Server Computing), Bicol University Graduate School  
**Fictional Setting**: Barangay Tago Health Center, Naga City, Camarines Sur  

---

## 1. Synthetic Data Notice (Academic Integrity)

> **CRITICAL**: This system operates **strictly and exclusively on synthetic (fictional) data**.
> No real resident, patient, or household data is contained in the source repository, database seed scripts, or test fixtures. Any resemblance to real persons, living or deceased, or actual households in Naga City is purely coincidental.
>
> In accordance with course guidelines and institutional ethics standards, real health center records, clinical charts, or citizen identifying information must **never** be loaded into this educational demonstration system.

---

## 2. Privacy Architecture & Statutory Alignment (RA 10173)

The system is designed following the core principles of the **Philippine Data Privacy Act of 2012 (Republic Act No. 10173)**: Transparency, Legitimate Purpose, and Proportionality.

### 2.1 Role-Based Access Control (RBAC) & Data Segregation

To ensure sensitive demographic and health risk data is accessed solely on a need-to-know basis, the application tier strictly enforces role boundaries:

1. **Administrator (`ADMIN`)**:
   - **Scope**: User account administration and role provisioning only.
   - **Privacy Boundary**: **Strictly barred from accessing resident health data.** The API middleware returns `403 Forbidden` if an administrator attempts to query `/api/residents`, `/api/households`, or `/api/masterlists`. Administrators cannot view resident profiles, medical conditions, or family planning methods.

2. **Barangay Health Worker (`BHW`)**:
   - **Scope**: Profiling and masterlist verification scoped strictly to assigned Puroks (zones).
   - **Privacy Boundary**: Cannot view or modify resident or household records in other puroks. Attempting to access an unassigned resident record returns a **`404 Not Found`** concealing the record's existence to prevent enumeration attacks. Attempting to query an unassigned zone returns `403 Forbidden`.

3. **Midwife (`MIDWIFE`)**:
   - **Scope**: Read-only oversight across all puroks for maternal and child health monitoring and target disease surveillance.
   - **Privacy Boundary**: Forbidden from modifying or deactivating resident records (returns `403 Forbidden` on POST/PATCH/DELETE).

---

## 3. Technical Safeguards & Implementation Review

The following privacy and security controls are implemented and verified in code:

| Safeguard | Implementation Mechanism | Verification Status |
| :--- | :--- | :--- |
| **Data in Transit Encryption** | Mandatory TLS 1.3/1.2 via Nginx reverse proxy. Port 443 is the single published port. HTTP traffic is redirected or disabled. | Tested in Step 9 (`nginx/nginx.conf`, `certs/`) |
| **Credential Protection** | Passwords hashed using `bcrypt` (work factor 10). Password hashes are excluded from all user query projections (`SELECT ... excluding password_hash`). | Verified in `api/src/routes/users.js` and `api/test/users.test.js` |
| **Error Message Masking** | Database error details (`err.detail`, internal table names, constraint messages) are intercepted by `errorHandler.js` and mapped to generic client codes to prevent data leakage. | Verified in `api/src/middleware/errorHandler.js` |
| **Anti-Reconnaissance** | BHW queries for records in other zones return `404 Not Found` rather than `403 Forbidden`, preventing workers from discovering if a resident exists in another purok. | Verified in `api/src/middleware/zoneAccess.js` and test suite |
| **Immutable Audit Logging** | Data modifications stamp `created_by`, `updated_by`, and `deactivated_by` via database triggers using `app.current_user_id`. Every change is logged to `change_log`. | Verified in `database/01_schema.sql` and `api/test/residents.test.js` |
| **Soft Deactivation (No Hard Deletes)** | `DELETE` operations are disabled on resident and household tables. Records are flagged `is_active = false`, preserving historical epidemiological integrity. | Verified in DB triggers and `api/src/routes/residents.js` |
| **Brute-Force Rate Limiting** | Authentication endpoints are throttled via `express-rate-limit` (max 10 attempts per 15 minutes per IP). | Verified in `api/src/routes/auth.js` and Step 12 benchmarks |
| **Principle of Least Privilege** | The API communicates with PostgreSQL as `bhc_api`, an unprivileged role without DDL rights or database ownership. | Verified in `database/02_api_role.sql` |

