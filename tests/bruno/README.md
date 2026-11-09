# Bruno API Test Collection

This directory contains the official **Bruno** collection for the Barangay Health Center Resident Profiling and Masterlist System API, matching [docs/openapi.yaml](file:///c:/Users/user/Downloads/bhc-system-starter/bhc-system/docs/openapi.yaml).

## 1. Structure

```
tests/bruno/
├── bruno.json                      # Bruno collection configuration
├── environments/
│   ├── Local.bru                   # http://localhost:3000
│   └── Docker.bru                  # https://localhost (port 443)
├── 01-auth/
│   ├── 01-login-bhw1-success.bru   # POST /api/auth/login (200)
│   ├── 02-login-admin-success.bru  # POST /api/auth/login (200)
│   ├── 03-login-midwife-success.bru# POST /api/auth/login (200)
│   ├── 04-login-invalid-credentials.bru # POST /api/auth/login (401)
│   ├── 05-login-short-username.bru # POST /api/auth/login (400)
│   ├── 06-logout-success.bru       # POST /api/auth/logout (200)
│   └── 07-logout-unauthenticated.bru # POST /api/auth/logout (401)
├── 02-households/
│   ├── 01-create-household-success.bru # POST /api/households (201)
│   ├── 02-create-household-forbidden-zone.bru # POST /api/households (403)
│   ├── 03-create-household-duplicate-resident.bru # POST /api/households (400)
│   ├── 04-get-household-success.bru # GET /api/households/{id} (200)
│   ├── 05-get-household-not-found.bru # GET /api/households/{id} (404)
│   └── 06-get-household-out-of-zone.bru # GET /api/households/{id} (404)
├── 03-residents/
│   ├── 01-search-residents-success.bru # GET /api/residents (200)
│   ├── 02-search-residents-forbidden-admin.bru # GET /api/residents (403)
│   ├── 03-search-residents-invalid-params.bru # GET /api/residents (400)
│   ├── 04-update-resident-success.bru # PATCH /api/residents/{id} (200)
│   ├── 05-update-resident-forbidden-midwife.bru # PATCH /api/residents/{id} (403)
│   ├── 06-update-resident-not-found.bru # PATCH /api/residents/{id} (404)
│   ├── 07-deactivate-resident-forbidden-midwife.bru # DELETE /api/residents/{id} (403)
│   ├── 08-deactivate-resident-not-found.bru # DELETE /api/residents/{id} (404)
│   ├── 09-deactivate-resident-success.bru # DELETE /api/residents/{id} (200)
│   ├── 10-search-archived-residents-success.bru # GET /api/residents?status=archived (200)
│   ├── 11-reactivate-resident-forbidden-midwife.bru # POST /api/residents/{id}/reactivate (403)
│   ├── 12-reactivate-resident-not-found.bru # POST /api/residents/{id}/reactivate (404)
│   ├── 13-resident-history-success.bru # GET /api/residents/{id}/history (200)
│   └── 14-resident-history-not-found.bru # GET /api/residents/{id}/history (404)
├── 04-masterlists/
│   ├── 01-masterlist-senior-citizen-success.bru # GET /api/masterlists (200)
│   ├── 02-masterlist-under-five-success.bru # GET /api/masterlists (200)
│   ├── 03-masterlist-pregnant-success.bru # GET /api/masterlists (200)
│   ├── 04-masterlist-pwd-success.bru # GET /api/masterlists (200)
│   ├── 05-masterlist-missing-category.bru # GET /api/masterlists (400)
│   └── 06-masterlist-admin-forbidden.bru # GET /api/masterlists (403)
└── 05-users/
    ├── 01-list-users-success.bru   # GET /api/users (200)
    ├── 02-list-users-forbidden-bhw.bru # GET /api/users (403)
    ├── 03-create-user-success.bru  # POST /api/users (201)
    ├── 04-create-user-validation-failed.bru # POST /api/users (400)
    ├── 05-update-user-success.bru  # PATCH /api/users/{id} (200)
    └── 06-update-user-not-found.bru # PATCH /api/users/{id} (404)
└── 06-account/
    ├── 01-change-password-unauthenticated.bru # POST /api/auth/password (401)
    ├── 02-change-password-wrong-current.bru   # POST /api/auth/password (400)
    ├── 03-change-password-success.bru         # POST /api/auth/password (200)
    └── 04-change-password-restore.bru         # POST /api/auth/password (200, back to Demo#12345)
```

## 2. All 12 Endpoints Coverage Matrix

| # | Endpoint | Method | Success Case | Failure Case(s) |
|---|---|---|---|---|
| 1 | `/api/auth/login` | POST | `01-login-bhw1-success` (200) | `04-login-invalid-credentials` (401), `05-login-short-username` (400) |
| 2 | `/api/auth/logout` | POST | `06-logout-success` (200) | `07-logout-unauthenticated` (401) |
| 3 | `/api/households` | POST | `01-create-household-success` (201) | `02-create-household-forbidden-zone` (403), `03-create-household-duplicate-resident` (400) |
| 4 | `/api/households/{id}` | GET | `04-get-household-success` (200) | `05-get-household-not-found` (404), `06-get-household-out-of-zone` (404) |
| 5 | `/api/residents` | GET | `01-search-residents-success` (200) | `02-search-residents-forbidden-admin` (403), `03-search-residents-invalid-params` (400) |
| 6 | `/api/residents/{id}` | PATCH | `04-update-resident-success` (200) | `05-update-resident-forbidden-midwife` (403), `06-update-resident-not-found` (404) |
| 7 | `/api/residents/{id}` | DELETE | `09-deactivate-resident-success` (200) | `07-deactivate-resident-forbidden-midwife` (403), `08-deactivate-resident-not-found` (404) |
| 8 | `/api/masterlists` | GET | `01-masterlist-senior-citizen-success` (200) | `05-masterlist-missing-category` (400), `06-masterlist-admin-forbidden` (403) |
| 9 | `/api/users` | GET | `01-list-users-success` (200) | `02-list-users-forbidden-bhw` (403) |
| 10 | `/api/users` | POST | `03-create-user-success` (201) | `04-create-user-validation-failed` (400) |
| 11 | `/api/users/{id}` | PATCH | `05-update-user-success` (200) | `06-update-user-not-found` (404) |
| 12 | `/api/auth/password` | POST | `03-change-password-success` (200) | `01-change-password-unauthenticated` (401), `02-change-password-wrong-current` (400) |

## 3. How to Run in Bruno Desktop

1. Open **Bruno**.
2. Click **Open Collection** and select the `tests/bruno` folder.
3. In the top-right environment selector, pick **Local** (for local development on port 3000) or **Docker** (for https://localhost).
4. Run the requests in `01-auth/` first:
   - `01-login-bhw1-success` saves `bhw1Token` and `token`.
   - `02-login-admin-success` saves `adminToken`.
   - `03-login-midwife-success` saves `midwifeToken`.
5. Run collection or individual folders (`02-households`, `03-residents`, `04-masterlists`, `05-users`, `06-account`).
   `06-account` changes `midwife1`'s password and then restores `Demo#12345`, so run all four of its requests in order.

