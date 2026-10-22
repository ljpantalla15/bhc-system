# Database Design: ERD and Data Dictionary

Oct 11, 2026 · @Lorenzo

Barangay Health Center Resident Profiling and Masterlist System · MIS 215: Client-Server Computing · PostgreSQL 13+ (tested on 16) · synthetic data only

## 1. Overview

The data tier has 17 tables, 6 enumerated types, 1 reporting view, and a set of helper and trigger functions. Eight tables hold the system's data. Nine are small code lists taken from the legends printed on the Household Profiling Form and from the Naga City PDAO disability categories.

- **Household details are stored once.** The paper form repeats visit date, water source, toilet type, and 4Ps on every member row; the database keeps them on the household.
- **Age is calculated, not stored.** Age and age risk group come from the birth date, so they never go out of date.
- **Nothing is deleted.** Residents and households are deactivated with is\_active = false. The API database role has no DELETE right on them.
- **Every change is logged.** Triggers write each create, update, and deactivation to an append-only change\_log with the user, date, and time.
- **Access rules live in the API.** The database adds constraints, the change log, and a restricted API role.

## 2. Entity-relationship diagram

&#91;embedded content: ERD · 8 core tables and 9 lookup tables\]

Residents, highlighted, are the central table: each belongs to one household, and the lookup tables supply the form's code lists. Full column lists are in section 3.

### Relationships

| Parent (1) | Child (N) | Foreign key | Meaning |
| --- | --- | --- | --- |
| users | user\_zone\_assignments | user\_id | A BHW can be assigned to several zones |
| zones | user\_zone\_assignments | zone\_id | A zone can have several BHWs |
| users | auth\_sessions | user\_id | A user can have several login sessions |
| zones | households | zone\_id | Each household belongs to one zone (purok) |
| users | households | interviewed\_by | BHW who interviewed the household |
| households | residents | household\_id | A household has one or more residents |
| residents | resident\_medical\_conditions | resident\_id | A resident can have several conditions |
| medical\_conditions | resident\_medical\_conditions | condition\_code | Hypertension, diabetes, TB, others |
| water\_source\_types | households | water\_source\_code | Type of water source |
| toilet\_facility\_types | households | toilet\_facility\_code | Type of toilet facility |
| civil\_statuses | residents | civil\_status\_code | Civil status |
| education\_levels | residents | education\_code | Educational attainment |
| religions | residents | religion\_code | Religion |
| disability\_types | residents | disability\_type\_code | PDAO disability category |
| fp\_methods | residents | fp\_method\_code | Family planning method used |
| fp\_statuses | residents | fp\_status\_code | Family planning status |
| users | users, households, residents, user\_zone\_assignments, change\_log | created\_by, updated\_by, deactivated\_by, assigned\_by, changed\_by | Who made a change (audit stamps) |

## 3. Data dictionary

**Key:** PK = primary key, FK = foreign key, UQ = unique. **Null:** N = required, Y = may be empty. Columns marked set by trigger are filled by the database, not the API.

### 3.1 users

Login accounts for the three roles: BHW, Midwife, and Administrator.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | bigint | N | PK | Auto-generated identifier |
| username | text | N | UQ | Login name: lowercase letters, digits, . \_ - (3 to 50 characters) |
| password\_hash | text | N |  | Argon2id or bcrypt hash; never plain text, never copied to the change log |
| full\_name | text | N |  | Account holder's full name |
| role | user\_role | N |  | BHW, MIDWIFE, or ADMIN; the API uses it to decide access |
| is\_active | boolean | N |  | Default true. False = account deactivated (kept, not deleted) |
| last\_login\_at | timestamptz | Y |  | Time of the last successful login |
| created\_at | timestamptz | N |  | Creation time (default now) |
| created\_by | bigint | Y | FK users | User who created the account |
| updated\_at | timestamptz | N |  | Last update time (set by trigger) |
| updated\_by | bigint | Y | FK users | User who made the last update (set by trigger) |

### 3.2 zones

Puroks (zones) of the barangay. BHWs are restricted to their assigned zones.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | bigint | N | PK | Auto-generated identifier |
| zone\_name | text | N | UQ | Zone or purok name; unique ignoring case and spaces |
| description | text | Y |  | Optional note |
| is\_active | boolean | N |  | Default true |
| created\_at | timestamptz | N |  | Creation time |

### 3.3 user\_zone\_assignments

Links BHW accounts to the zones they cover. A trigger rejects any user who is not a BHW.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| user\_id | bigint | N | PK, FK users | The BHW |
| zone\_id | bigint | N | PK, FK zones | The assigned zone |
| assigned\_at | timestamptz | N |  | When the assignment was made |
| assigned\_by | bigint | Y | FK users | Administrator who made it |

### 3.4 auth\_sessions

Server-side sessions, so that logout (POST /api/auth/logout) really ends a session.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | uuid | N | PK | Session or token identifier (random UUID) |
| user\_id | bigint | N | FK users | Session owner |
| issued\_at | timestamptz | N |  | When the token was issued |
| expires\_at | timestamptz | N |  | Must be later than issued\_at |
| revoked\_at | timestamptz | Y |  | Set on logout. Empty = still valid |

### 3.5 households

One row per household: the top section of the Household Profiling Form plus water, toilet, and 4Ps details.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | bigint | N | PK | Auto-generated identifier |
| household\_no | text | N | UQ | Form: Household No. Format yyyymm-FacilityCode-00000, e.g. 202610-TAGO-00001 |
| date\_of\_visit | date | N |  | Form: Date of Visit. Cannot be in the future |
| visit\_quarter | smallint | N |  | 1 to 4, calculated from date\_of\_visit (form: First to Fourth Quarter) |
| zone\_id | bigint | N | FK zones | Zone (purok) where the household lives |
| address\_line | text | Y |  | Optional street or landmark |
| barangay | text | N |  | Default Tago |
| municipality\_city | text | N |  | Default Naga City |
| province | text | N |  | Default Camarines Sur |
| water\_source\_code | text | Y | FK water\_source\_types | Form: Type of Water Source |
| toilet\_facility\_code | text | Y | FK toilet\_facility\_types | Form: Type of Toilet Facility |
| is\_4ps\_household | boolean | N |  | Form: 4Ps member? Default false |
| fourps\_household\_id | text | Y |  | 4Ps Household ID. Allowed only when is\_4ps\_household is true |
| interviewed\_by | bigint | N | FK users | Form: Interviewed by. The BHW who encoded the household |
| reviewed\_by\_name | text | Y |  | Form: Reviewed by, as written on paper (review happens outside the system) |
| is\_active | boolean | N |  | Default true. False = deactivated |
| deactivated\_at | timestamptz | Y |  | Set by trigger when deactivated |
| deactivated\_by | bigint | Y | FK users | Set by trigger |
| deactivation\_reason | text | Y |  | Optional reason |
| created\_at | timestamptz | N |  | Creation time |
| created\_by | bigint | Y | FK users | Encoding user |
| updated\_at | timestamptz | N |  | Set by trigger |
| updated\_by | bigint | Y | FK users | Set by trigger |

### 3.6 residents

One row per household member (one row of the form). Age and age risk group are calculated from birth\_date.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | bigint | N | PK | Auto-generated identifier |
| household\_id | bigint | N | FK households | Household the resident belongs to |
| last\_name | text | N |  | Form: Last Name. Not blank |
| first\_name | text | N |  | Form: First Name. Not blank |
| middle\_name | text | Y |  | Form: Middle Name |
| relation\_to\_head | relation\_to\_head\_t | N |  | HEAD, SPOUSE, SON, DAUGHTER, or OTHER (form codes 1 to 5) |
| relation\_other | text | Y |  | Required when relation is OTHER (specify relation); otherwise empty |
| birth\_date | date | N |  | Form: Date of Birth. Between 1900-01-01 and today |
| sex | sex\_t | N |  | M or F |
| civil\_status\_code | text | N | FK civil\_statuses | Form: Civil Status |
| education\_code | text | N | FK education\_levels | Form: Educational Attainment |
| religion\_code | text | Y | FK religions | Form: Religion |
| religion\_other | text | Y |  | Required when religion is Others |
| ethnic\_group | ethnic\_group\_t | Y |  | IP or NON\_IP |
| occupation | text | Y |  | Form: Occupation |
| philhealth\_id | text | Y |  | Exactly 12 digits. Unique among active residents |
| philhealth\_membership | philhealth\_membership\_t | Y |  | MEMBER or DEPENDENT |
| philhealth\_category | philhealth\_category\_t | Y |  | DIRECT or INDIRECT contributor. Only for members |
| is\_pregnant | boolean | N |  | Default false. Females only |
| lmp\_date | date | Y |  | Last menstrual period. Required if pregnant, empty otherwise |
| uses\_fp | boolean | Y |  | Using any FP method? Empty = not applicable. Females only |
| fp\_method\_code | text | Y | FK fp\_methods | Required when uses\_fp is true; empty otherwise |
| fp\_method\_other | text | Y |  | Required when the method is Others |
| fp\_status\_code | text | Y | FK fp\_statuses | Form: FP Status (new acceptor, current user, and so on). Females only |
| is\_pwd | boolean | N |  | Person with disability. Default false. Not on the paper form; needed for the PWD masterlist |
| disability\_type\_code | text | Y | FK disability\_types | PDAO disability category. Allowed only when is\_pwd is true |
| is\_active | boolean | N |  | Default true. False = deactivated |
| deactivated\_at | timestamptz | Y |  | Set by trigger when deactivated |
| deactivated\_by | bigint | Y | FK users | Set by trigger |
| deactivation\_reason | text | Y |  | Optional reason |
| created\_at | timestamptz | N |  | Creation time |
| created\_by | bigint | Y | FK users | Encoding user |
| updated\_at | timestamptz | N |  | Set by trigger |
| updated\_by | bigint | Y | FK users | Set by trigger |

### 3.7 resident\_medical\_conditions

Medical history from the form, one row per condition.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| resident\_id | bigint | N | PK, FK residents | The resident |
| condition\_code | text | N | PK, FK medical\_conditions | HPN, DM, TB, or OTH |
| other\_specify | text | Y |  | Required when the condition is OTH; otherwise empty |

### 3.8 change\_log

Append-only audit trail, written by triggers. Rows cannot be updated or deleted. There is no foreign key on record\_id: together with table\_name it points at the changed row.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| id | bigint | N | PK | Auto-generated identifier |
| table\_name | text | N |  | Table that changed |
| record\_id | bigint | N |  | Id of the changed row (user id for zone assignments, resident id for conditions) |
| action | text | N |  | CREATE, UPDATE, DEACTIVATE, REACTIVATE, or DELETE |
| changed\_by | bigint | Y | FK users | User who made the change (from app.current\_user\_id) |
| changed\_at | timestamptz | N |  | Date and time of the change |
| changed\_fields | text\[\] | Y |  | Names of the fields that changed (updates only) |
| old\_data | jsonb | Y |  | Row before the change; password hash removed |
| new\_data | jsonb | Y |  | Row after the change; password hash removed |

### 3.9 Reference (lookup) tables

Nine tables share the same structure. toilet\_facility\_types adds is\_sanitary.

| Column | Type | Null | Key | Description |
| --- | --- | --- | --- | --- |
| code | text | N | PK | Short code, as printed on the form legend |
| label | text | N | UQ | Full name shown to users |
| sort\_order | smallint | N |  | Display order |
| is\_sanitary | boolean | N |  | toilet\_facility\_types only: true for sanitary toilets |

Values:

| Table | Codes and labels |
| --- | --- |
| civil\_statuses | M Married · S Single · W Widow/er · SP Separated · C Cohabitation |
| education\_levels | N None · PS Pre-school · ES Elementary student · EU Elementary undergraduate · EG Elementary graduate · HS High school student · HU High school undergraduate · HG High school graduate · SH Senior high school · ALS Alternative Learning System · V Vocational course · CS College student · CU College undergraduate · CG College graduate · PG Postgraduate / Doctorate |
| religions | RC Roman Catholic · CHR Christian · INC Iglesia ni Cristo · ISL Islam · BAP Baptist · BAC Born Again Christian · BUD Buddhism · COG Church of God · JW Jehovah's Witness · PRO Protestant · SDA Seventh Day Adventist · LDS LDS-Mormons · EVA Evangelical · PEN Pentecostal · UNK Unknown · OTH Others (specify) |
| medical\_conditions | HPN Hypertension · DM Diabetes · TB Tuberculosis · OTH Others (specify) |
| disability\_types | LD Learning disability · SPEECH Speech impairment · PHYS Physical disability · ORTHO Orthopedic · VISUAL Visual disability · DHH Deaf and hard-of-hearing · INTEL Intellectual disability · PSYCHO Psychosocial disability · MENTAL Mental disability · CANCER Cancer · RARE Rare disease |
| fp\_methods | COC · POP · INJ Injectable · WD Withdrawal · IUD · CON Condom · LAM · BTL · IMP Implant · SDM · DPT · OTH Others (specify) |
| fp\_statuses | NA New acceptor · CU Current user · CM Changing method · CC Changing clinic · DO Dropout · R Restarter |
| water\_source\_types | LV1 Level I point source · LV2 Level II communal faucet or stand posts · LV3 Level III waterworks or individual house connection · O Doubtful sources, open dug well, etc. |
| toilet\_facility\_types | Sanitary: P Pour/flush to septic tank · PF Pour/flush to septic tank and sewerage · VIP Ventilated improved pit latrine or composting toilet. Unsanitary: WS Water-sealed to open drain · OH Overhung latrine · OP Open-pit latrine · WO Without toilet |

## 4. Enumerated types

| Type | Values | Used by |
| --- | --- | --- |
| user\_role | BHW, MIDWIFE, ADMIN | users.role |
| sex\_t | M, F | residents.sex |
| relation\_to\_head\_t | HEAD, SPOUSE, SON, DAUGHTER, OTHER | residents.relation\_to\_head |
| ethnic\_group\_t | IP, NON\_IP | residents.ethnic\_group |
| philhealth\_membership\_t | MEMBER, DEPENDENT | residents.philhealth\_membership |
| philhealth\_category\_t | DIRECT, INDIRECT | residents.philhealth\_category |

## 5. Business rules enforced by the database

| Rule | How it is enforced |
| --- | --- |
| No exact duplicate residents: same full name and birth date among active residents, in any household | Unique index residents\_no\_exact\_duplicate\_uq |
| One active head per household | Unique partial index residents\_one\_head\_per\_household\_uq |
| A PhilHealth number belongs to one active resident and has 12 digits | Unique partial index plus check constraint |
| Pregnancy is for females only; LMP required if pregnant, empty if not | Check constraints |
| FP method required when uses\_fp is true; FP fields for females only | Check constraints |
| Details required when relation, religion, FP method, or condition is Others | Check constraints |
| Household number format yyyymm-FacilityCode-00000; visit date not in the future | Check constraints |
| 4Ps household ID only when 4Ps is yes; disability type only when is\_pwd is true | Check constraints |
| Only BHW accounts can have zone assignments | Trigger on user\_zone\_assignments |
| Deactivation keeps the record; who and when are stamped automatically | Triggers, plus no DELETE right for the API role |
| Change log is append-only and never holds password hashes | Triggers on change\_log and users |
| updated\_at and updated\_by are set automatically | Trigger touch\_row |

## 6. Views and functions

| Name | Kind | Purpose |
| --- | --- | --- |
| v\_active\_residents | View | Active residents in active households, with age, age group, medical history, and household details |
| masterlist(category, zone\_ids) | Function | Masterlist for SENIOR\_CITIZEN, UNDER\_FIVE, PREGNANT, or PWD. zone\_ids NULL = all zones (Midwife) |
| find\_possible\_duplicates(last\_name, first\_name, birth\_date, ...) | Function | Active residents with the same birth date and a similar name (pg\_trgm) |
| age\_years, age\_months, age\_risk\_group | Functions | Age from birth date. Risk groups: N, I, PSAC, SAC, AD, A, SC |
| app\_user\_id() | Function | Reads app.current\_user\_id, which the API sets at the start of every transaction |
| log\_change, touch\_row, sync\_deactivation, enforce\_bhw\_zone\_assignment, prevent\_change\_log\_modification | Trigger functions | Change log, update stamps, deactivation stamps, BHW-only zones, append-only log |
