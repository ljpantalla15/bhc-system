-- =============================================================================
-- Barangay Health Center Resident Profiling and Masterlist System
-- MIS 215: Client-Server Computing | Bicol University Graduate School
-- File 1 of 3: schema, reference data, constraints, triggers, views, functions
--
-- Target: PostgreSQL 13+ (tested on 16). Run as the database owner/superuser:
--   psql -v ON_ERROR_STOP=1 -d <dbname> -f 01_schema.sql
--
-- How the API should talk to this database
--   * At the start of EVERY transaction that changes data, run:
--       SELECT set_config('app.current_user_id', '<users.id>', true);
--     Triggers use it to fill created_by / updated_by and the change log.
--   * Never DELETE residents or households. Set is_active = false instead.
--   * Role, zone and health-data access rules are enforced by the API.
--     The database adds constraints, an append-only change log, and (file 2)
--     a least-privilege role that has no DELETE on resident data.
--
-- All data used with this schema must be synthetic.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fuzzy duplicate detection

-- -----------------------------------------------------------------------------
-- 1. Enumerated types (short, stable lists)
-- -----------------------------------------------------------------------------
CREATE TYPE user_role              AS ENUM ('BHW', 'MIDWIFE', 'ADMIN');
CREATE TYPE sex_t                  AS ENUM ('M', 'F');
CREATE TYPE relation_to_head_t     AS ENUM ('HEAD', 'SPOUSE', 'SON', 'DAUGHTER', 'OTHER');
CREATE TYPE ethnic_group_t         AS ENUM ('IP', 'NON_IP');
CREATE TYPE philhealth_membership_t AS ENUM ('MEMBER', 'DEPENDENT');
CREATE TYPE philhealth_category_t  AS ENUM ('DIRECT', 'INDIRECT');

-- -----------------------------------------------------------------------------
-- 2. Helper: id of the application user making the current change
-- -----------------------------------------------------------------------------
CREATE FUNCTION app_user_id() RETURNS bigint
LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::bigint $$;

-- -----------------------------------------------------------------------------
-- 3. Reference (lookup) tables - values come from the legends on the
--    Household Profiling Form
-- -----------------------------------------------------------------------------
CREATE TABLE civil_statuses (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO civil_statuses VALUES
  ('M','Married',1), ('S','Single',2), ('W','Widow/er',3),
  ('SP','Separated',4), ('C','Cohabitation',5);

CREATE TABLE education_levels (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO education_levels VALUES
  ('N','None',1), ('PS','Pre-school',2), ('ES','Elementary student',3),
  ('EU','Elementary undergraduate',4), ('EG','Elementary graduate',5),
  ('HS','High school student',6), ('HU','High school undergraduate',7),
  ('HG','High school graduate',8), ('SH','Senior high school',9),
  ('ALS','Alternative Learning System',10), ('V','Vocational course',11),
  ('CS','College student',12), ('CU','College undergraduate',13),
  ('CG','College graduate',14), ('PG','Postgraduate / Doctorate',15);

CREATE TABLE religions (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO religions VALUES
  ('RC','Roman Catholic',1), ('CHR','Christian',2), ('INC','Iglesia ni Cristo',3),
  ('ISL','Islam',4), ('BAP','Baptist',5), ('BAC','Born Again Christian',6),
  ('BUD','Buddhism',7), ('COG','Church of God',8), ('JW','Jehovah''s Witness',9),
  ('PRO','Protestant',10), ('SDA','Seventh Day Adventist',11), ('LDS','LDS-Mormons',12),
  ('EVA','Evangelical',13), ('PEN','Pentecostal',14), ('UNK','Unknown',15),
  ('OTH','Others (specify)',16);

CREATE TABLE medical_conditions (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO medical_conditions VALUES
  ('HPN','Hypertension',1), ('DM','Diabetes',2), ('TB','Tuberculosis',3),
  ('OTH','Others (specify)',4);

-- Types of disability, matching the categories the Naga City PDAO uses for
-- PWD ID holders (PDAO data as of September 30, 2026).
CREATE TABLE disability_types (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO disability_types VALUES
  ('LD','Learning disability',1), ('SPEECH','Speech impairment',2),
  ('PHYS','Physical disability',3), ('ORTHO','Orthopedic',4),
  ('VISUAL','Visual disability',5), ('DHH','Deaf and hard-of-hearing',6),
  ('INTEL','Intellectual disability',7), ('PSYCHO','Psychosocial disability',8),
  ('MENTAL','Mental disability',9), ('CANCER','Cancer',10), ('RARE','Rare disease',11);

CREATE TABLE fp_methods (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO fp_methods VALUES
  ('COC','COC (combined oral contraceptive)',1), ('POP','POP (progestin-only pill)',2),
  ('INJ','Injectable',3), ('WD','Withdrawal',4), ('IUD','IUD',5), ('CON','Condom',6),
  ('LAM','LAM',7), ('BTL','BTL',8), ('IMP','Implant',9), ('SDM','SDM',10),
  ('DPT','DPT',11), ('OTH','Others (specify)',12);

CREATE TABLE fp_statuses (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO fp_statuses VALUES
  ('NA','New acceptor',1), ('CU','Current user',2), ('CM','Changing method',3),
  ('CC','Changing clinic',4), ('DO','Dropout',5), ('R','Restarter',6);

CREATE TABLE water_source_types (
  code text PRIMARY KEY, label text NOT NULL UNIQUE, sort_order smallint NOT NULL);
INSERT INTO water_source_types VALUES
  ('LV1','Level I - Point source',1),
  ('LV2','Level II - Communal faucet system or stand posts',2),
  ('LV3','Level III - Waterworks system or individual house connection',3),
  ('O','For doubtful sources, open dug well, etc.',4);

CREATE TABLE toilet_facility_types (
  code text PRIMARY KEY, label text NOT NULL UNIQUE,
  is_sanitary boolean NOT NULL, sort_order smallint NOT NULL);
INSERT INTO toilet_facility_types VALUES
  ('P','Pour/flush toilet connected to septic tank',true,1),
  ('PF','Pour/flush toilet connected to septic tank and to sewerage system',true,2),
  ('VIP','Ventilated improved pit latrine (VIP) or composting toilet',true,3),
  ('WS','Water-sealed toilet connected to open drain',false,4),
  ('OH','Overhung latrine',false,5),
  ('OP','Open-pit latrine',false,6),
  ('WO','Without toilet',false,7);

-- -----------------------------------------------------------------------------
-- 4. Zones (puroks), users, access
-- -----------------------------------------------------------------------------
CREATE TABLE zones (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zone_name   text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zones_name_not_blank CHECK (btrim(zone_name) <> '')
);
CREATE UNIQUE INDEX zones_name_uq ON zones (lower(btrim(zone_name)));

CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      text NOT NULL,
  password_hash text NOT NULL,              -- Argon2id or bcrypt hash, never plain text
  full_name     text NOT NULL,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    bigint REFERENCES users (id) DEFAULT app_user_id(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    bigint REFERENCES users (id),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9._-]{3,50}$'),
  CONSTRAINT users_full_name_not_blank CHECK (btrim(full_name) <> ''),
  CONSTRAINT users_password_hash_not_blank CHECK (btrim(password_hash) <> '')
);
CREATE UNIQUE INDEX users_username_uq ON users (username);

-- BHWs only see records in their assigned zones. The Midwife sees all zones;
-- the Administrator sees no resident data. The API applies these rules.
CREATE TABLE user_zone_assignments (
  user_id     bigint NOT NULL REFERENCES users (id),
  zone_id     bigint NOT NULL REFERENCES zones (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by bigint REFERENCES users (id) DEFAULT app_user_id(),
  PRIMARY KEY (user_id, zone_id)
);

CREATE FUNCTION enforce_bhw_zone_assignment() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'BHW' THEN
    RAISE EXCEPTION 'Only BHW accounts can be assigned to zones'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_zone_assignment_bhw_only
  BEFORE INSERT OR UPDATE ON user_zone_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_bhw_zone_assignment();

-- Server-side sessions so POST /api/auth/logout can really end a session
CREATE TABLE auth_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    bigint NOT NULL REFERENCES users (id),
  issued_at  timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT auth_sessions_expiry_after_issue CHECK (expires_at > issued_at)
);
CREATE INDEX auth_sessions_active_idx ON auth_sessions (user_id) WHERE revoked_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. Households  (top section of the form + water, toilet, 4Ps)
-- -----------------------------------------------------------------------------
CREATE TABLE households (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_no          text NOT NULL,            -- form format: yyyymm-FacilityCode-00000
  date_of_visit         date NOT NULL,
  visit_quarter         smallint GENERATED ALWAYS AS
                          ((EXTRACT(QUARTER FROM date_of_visit))::smallint) STORED,
  zone_id               bigint NOT NULL REFERENCES zones (id),
  address_line          text,
  barangay              text NOT NULL DEFAULT 'Tago',
  municipality_city     text NOT NULL DEFAULT 'Naga City',
  province              text NOT NULL DEFAULT 'Camarines Sur',
  water_source_code     text REFERENCES water_source_types (code),
  toilet_facility_code  text REFERENCES toilet_facility_types (code),
  is_4ps_household      boolean NOT NULL DEFAULT false,
  fourps_household_id   text,
  interviewed_by        bigint NOT NULL DEFAULT app_user_id() REFERENCES users (id),
  reviewed_by_name      text,                     -- review happens on paper, outside the system
  is_active             boolean NOT NULL DEFAULT true,
  deactivated_at        timestamptz,
  deactivated_by        bigint REFERENCES users (id),
  deactivation_reason   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            bigint REFERENCES users (id) DEFAULT app_user_id(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            bigint REFERENCES users (id),
  CONSTRAINT households_no_format
    CHECK (household_no ~ '^[0-9]{6}-[A-Za-z0-9]+-[0-9]{5}$'),
  CONSTRAINT households_visit_not_future CHECK (date_of_visit <= CURRENT_DATE),
  CONSTRAINT households_4ps_id_needs_4ps
    CHECK (is_4ps_household OR fourps_household_id IS NULL),
  CONSTRAINT households_deactivation_consistent
    CHECK ((is_active AND deactivated_at IS NULL)
        OR (NOT is_active AND deactivated_at IS NOT NULL))
);
CREATE UNIQUE INDEX households_no_uq ON households (household_no);
CREATE INDEX households_zone_idx ON households (zone_id) WHERE is_active;

-- -----------------------------------------------------------------------------
-- 6. Residents  (one row per household member on the form)
-- -----------------------------------------------------------------------------
CREATE TABLE residents (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  household_id          bigint NOT NULL REFERENCES households (id),

  -- Name of household members
  last_name             text NOT NULL,
  first_name            text NOT NULL,
  middle_name           text,
  relation_to_head      relation_to_head_t NOT NULL,
  relation_other        text,                     -- "5 - Others, specify relation"

  -- Demographics (age and age group are derived, see views)
  birth_date            date NOT NULL,
  sex                   sex_t NOT NULL,
  civil_status_code     text NOT NULL REFERENCES civil_statuses (code),
  education_code        text NOT NULL REFERENCES education_levels (code),
  religion_code         text REFERENCES religions (code),
  religion_other        text,
  ethnic_group          ethnic_group_t,
  occupation            text,

  -- PhilHealth
  philhealth_id         text,
  philhealth_membership philhealth_membership_t,
  philhealth_category   philhealth_category_t,

  -- Maternal and family planning (women only)
  is_pregnant           boolean NOT NULL DEFAULT false,
  lmp_date              date,                     -- last menstrual period, if pregnant
  uses_fp               boolean,                  -- NULL = not applicable / not asked
  fp_method_code        text REFERENCES fp_methods (code),
  fp_method_other       text,
  fp_status_code        text REFERENCES fp_statuses (code),

  -- Not on the paper form, but the proposal needs it for the PWD masterlist.
  -- Type of disability follows the Naga City PDAO categories (optional).
  is_pwd                boolean NOT NULL DEFAULT false,
  disability_type_code  text REFERENCES disability_types (code),

  -- Soft delete + audit stamps
  is_active             boolean NOT NULL DEFAULT true,
  deactivated_at        timestamptz,
  deactivated_by        bigint REFERENCES users (id),
  deactivation_reason   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            bigint REFERENCES users (id) DEFAULT app_user_id(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            bigint REFERENCES users (id),

  CONSTRAINT residents_names_not_blank
    CHECK (btrim(last_name) <> '' AND btrim(first_name) <> ''),
  CONSTRAINT residents_birth_date_valid
    CHECK (birth_date BETWEEN DATE '1900-01-01' AND CURRENT_DATE),
  CONSTRAINT residents_relation_other
    CHECK ((relation_to_head = 'OTHER' AND btrim(coalesce(relation_other, '')) <> '')
        OR (relation_to_head <> 'OTHER' AND relation_other IS NULL)),
  CONSTRAINT residents_religion_other
    CHECK ((religion_code = 'OTH' AND btrim(coalesce(religion_other, '')) <> '')
        OR (religion_code IS DISTINCT FROM 'OTH' AND religion_other IS NULL)),
  CONSTRAINT residents_philhealth_id_format
    CHECK (philhealth_id IS NULL OR philhealth_id ~ '^[0-9]{12}$'),
  CONSTRAINT residents_philhealth_category_needs_member
    CHECK (philhealth_category IS NULL OR philhealth_membership = 'MEMBER'),
  CONSTRAINT residents_pregnancy_female_only CHECK (NOT is_pregnant OR sex = 'F'),
  CONSTRAINT residents_lmp_iff_pregnant
    CHECK ((is_pregnant AND lmp_date IS NOT NULL) OR (NOT is_pregnant AND lmp_date IS NULL)),
  CONSTRAINT residents_lmp_valid
    CHECK (lmp_date IS NULL OR (lmp_date <= CURRENT_DATE AND lmp_date > birth_date)),
  CONSTRAINT residents_fp_female_only
    CHECK (sex = 'F' OR (uses_fp IS NULL AND fp_method_code IS NULL AND fp_status_code IS NULL)),
  CONSTRAINT residents_fp_method_iff_using
    CHECK ((uses_fp IS TRUE) = (fp_method_code IS NOT NULL)),
  CONSTRAINT residents_fp_method_other
    CHECK ((fp_method_code = 'OTH' AND btrim(coalesce(fp_method_other, '')) <> '')
        OR (fp_method_code IS DISTINCT FROM 'OTH' AND fp_method_other IS NULL)),
  CONSTRAINT residents_disability_needs_pwd CHECK (is_pwd OR disability_type_code IS NULL),
  CONSTRAINT residents_deactivation_consistent
    CHECK ((is_active AND deactivated_at IS NULL)
        OR (NOT is_active AND deactivated_at IS NOT NULL))
);

-- Medical history: one row per condition (HPN, DM, TB, Others)
CREATE TABLE resident_medical_conditions (
  resident_id    bigint NOT NULL REFERENCES residents (id),
  condition_code text NOT NULL REFERENCES medical_conditions (code),
  other_specify  text,
  PRIMARY KEY (resident_id, condition_code),
  CONSTRAINT rmc_other_specify
    CHECK ((condition_code = 'OTH' AND btrim(coalesce(other_specify, '')) <> '')
        OR (condition_code <> 'OTH' AND other_specify IS NULL))
);

-- Duplicate prevention (problem 1 in the proposal)
-- 1) Exact duplicate: same full name + birth date among active residents,
--    regardless of household or BHW. Returns SQLSTATE 23505 to the API.
CREATE UNIQUE INDEX residents_no_exact_duplicate_uq
  ON residents (lower(btrim(last_name)), lower(btrim(first_name)),
                lower(btrim(coalesce(middle_name, ''))), birth_date)
  WHERE is_active;
-- 2) One active household head per household.
CREATE UNIQUE INDEX residents_one_head_per_household_uq
  ON residents (household_id)
  WHERE relation_to_head = 'HEAD' AND is_active;
-- 3) A PhilHealth number belongs to one active resident.
CREATE UNIQUE INDEX residents_philhealth_id_uq
  ON residents (philhealth_id)
  WHERE philhealth_id IS NOT NULL AND is_active;

CREATE INDEX residents_household_idx ON residents (household_id);
CREATE INDEX residents_birth_date_idx ON residents (birth_date) WHERE is_active;
CREATE INDEX residents_name_trgm_idx
  ON residents USING gin ((lower(last_name || ' ' || first_name)) gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 7. Change log (append-only) - who changed what, when
-- -----------------------------------------------------------------------------
CREATE TABLE change_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name     text NOT NULL,
  record_id      bigint NOT NULL,
  action         text NOT NULL
                 CHECK (action IN ('CREATE', 'UPDATE', 'DEACTIVATE', 'REACTIVATE', 'DELETE')),
  changed_by     bigint REFERENCES users (id),
  changed_at     timestamptz NOT NULL DEFAULT now(),
  changed_fields text[],
  old_data       jsonb,
  new_data       jsonb
);
CREATE INDEX change_log_record_idx ON change_log (table_name, record_id, changed_at DESC);
CREATE INDEX change_log_user_idx   ON change_log (changed_by, changed_at DESC);

CREATE FUNCTION prevent_change_log_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'change_log is append-only' USING ERRCODE = '42501';
END $$;

CREATE TRIGGER trg_change_log_no_update_delete
  BEFORE UPDATE OR DELETE ON change_log
  FOR EACH ROW EXECUTE FUNCTION prevent_change_log_modification();
CREATE TRIGGER trg_change_log_no_truncate
  BEFORE TRUNCATE ON change_log
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_change_log_modification();

-- Generic logger. TG_ARGV[0] = column holding the record id.
-- SECURITY DEFINER lets the API role cause log rows without being able to
-- write to change_log directly. Password hashes are never copied into the log.
CREATE FUNCTION log_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pk      text := TG_ARGV[0];
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_action  text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_action := 'CREATE';
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_action := 'DELETE';
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    SELECT array_agg(n.key ORDER BY n.key) INTO v_changed
      FROM jsonb_each(v_new) AS n
     WHERE (v_old -> n.key) IS DISTINCT FROM n.value
       AND n.key NOT IN ('updated_at', 'updated_by');
    IF v_changed IS NULL THEN
      RETURN NULL;                     -- nothing meaningful changed
    END IF;
    v_action := 'UPDATE';
    IF (v_old ->> 'is_active') = 'true' AND (v_new ->> 'is_active') = 'false' THEN
      v_action := 'DEACTIVATE';
    ELSIF (v_old ->> 'is_active') = 'false' AND (v_new ->> 'is_active') = 'true' THEN
      v_action := 'REACTIVATE';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'users' THEN
    v_old := v_old - 'password_hash';
    v_new := v_new - 'password_hash';
  END IF;

  INSERT INTO change_log (table_name, record_id, action, changed_by,
                          changed_fields, old_data, new_data)
  VALUES (TG_TABLE_NAME, (COALESCE(v_new, v_old) ->> v_pk)::bigint, v_action,
          app_user_id(), v_changed, v_old, v_new);
  RETURN NULL;
END $$;

-- updated_at / updated_by stamps
CREATE FUNCTION touch_row() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(app_user_id(), NEW.updated_by);
  RETURN NEW;
END $$;

-- Fills / clears deactivated_at and deactivated_by when is_active flips
CREATE FUNCTION sync_deactivation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    NEW.deactivated_at := now();
    NEW.deactivated_by := app_user_id();
  ELSIF NOT OLD.is_active AND NEW.is_active THEN
    NEW.deactivated_at := NULL;
    NEW.deactivated_by := NULL;
    NEW.deactivation_reason := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_users_touch       BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION touch_row();
CREATE TRIGGER trg_households_touch  BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION touch_row();
CREATE TRIGGER trg_residents_touch   BEFORE UPDATE ON residents  FOR EACH ROW EXECUTE FUNCTION touch_row();
CREATE TRIGGER trg_households_deact  BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION sync_deactivation();
CREATE TRIGGER trg_residents_deact   BEFORE UPDATE ON residents  FOR EACH ROW EXECUTE FUNCTION sync_deactivation();

CREATE TRIGGER trg_users_log
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_change('id');
CREATE TRIGGER trg_zone_assignments_log
  AFTER INSERT OR UPDATE OR DELETE ON user_zone_assignments
  FOR EACH ROW EXECUTE FUNCTION log_change('user_id');
CREATE TRIGGER trg_households_log
  AFTER INSERT OR UPDATE OR DELETE ON households
  FOR EACH ROW EXECUTE FUNCTION log_change('id');
CREATE TRIGGER trg_residents_log
  AFTER INSERT OR UPDATE OR DELETE ON residents
  FOR EACH ROW EXECUTE FUNCTION log_change('id');
CREATE TRIGGER trg_resident_conditions_log
  AFTER INSERT OR UPDATE OR DELETE ON resident_medical_conditions
  FOR EACH ROW EXECUTE FUNCTION log_change('resident_id');

-- -----------------------------------------------------------------------------
-- 8. Age helpers (age is derived from birth_date, never stored)
-- -----------------------------------------------------------------------------
CREATE FUNCTION age_years(p_birth date, p_as_of date DEFAULT CURRENT_DATE) RETURNS int
LANGUAGE sql IMMUTABLE AS
$$ SELECT date_part('year', age(p_as_of::timestamp, p_birth::timestamp))::int $$;

CREATE FUNCTION age_months(p_birth date, p_as_of date DEFAULT CURRENT_DATE) RETURNS int
LANGUAGE sql IMMUTABLE AS
$$ SELECT date_part('month', age(p_as_of::timestamp, p_birth::timestamp))::int $$;

-- "Classification by Age / Health Risk Group" legend on the form
--   N newborn 0-28 days | I infant (to <1 y) | PSAC 1-4 | SAC 5-9
--   AD adolescent 10-19 | A adult 20-59 | SC senior citizen 60+
CREATE FUNCTION age_risk_group(p_birth date, p_as_of date DEFAULT CURRENT_DATE) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN (p_as_of - p_birth) <= 28 THEN 'N'
    WHEN age_years(p_birth, p_as_of) < 1  THEN 'I'
    WHEN age_years(p_birth, p_as_of) <= 4 THEN 'PSAC'
    WHEN age_years(p_birth, p_as_of) <= 9 THEN 'SAC'
    WHEN age_years(p_birth, p_as_of) <= 19 THEN 'AD'
    WHEN age_years(p_birth, p_as_of) <= 59 THEN 'A'
    ELSE 'SC'
  END
$$;

-- -----------------------------------------------------------------------------
-- 9. Reporting view and masterlist function
-- -----------------------------------------------------------------------------
CREATE VIEW v_active_residents AS
SELECT
  r.id AS resident_id,
  r.household_id, h.household_no, h.zone_id, z.zone_name,
  r.last_name, r.first_name, r.middle_name,
  r.relation_to_head, r.relation_other,
  r.birth_date,
  age_years(r.birth_date)  AS age_years,
  age_months(r.birth_date) AS age_months,
  age_risk_group(r.birth_date) AS age_risk_group,
  r.sex, r.civil_status_code, r.education_code,
  r.religion_code, r.religion_other, r.ethnic_group, r.occupation,
  r.philhealth_id, r.philhealth_membership, r.philhealth_category,
  r.is_pregnant, r.lmp_date,
  r.uses_fp, r.fp_method_code, r.fp_method_other, r.fp_status_code,
  r.is_pwd, r.disability_type_code, dt.label AS disability_type,
  (SELECT string_agg(
            CASE WHEN rmc.condition_code = 'OTH'
                 THEN 'Others: ' || rmc.other_specify ELSE mc.label END,
            '; ' ORDER BY mc.sort_order)
     FROM resident_medical_conditions rmc
     JOIN medical_conditions mc ON mc.code = rmc.condition_code
    WHERE rmc.resident_id = r.id) AS medical_history,
  h.date_of_visit, h.visit_quarter,
  h.water_source_code, h.toilet_facility_code,
  h.is_4ps_household, h.fourps_household_id
FROM residents r
JOIN households h ON h.id = r.household_id AND h.is_active
JOIN zones z      ON z.id = h.zone_id
LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
WHERE r.is_active;

-- GET /api/masterlists?zone=..&category=..
--   p_category: SENIOR_CITIZEN | UNDER_FIVE | PREGNANT | PWD
--   p_zone_ids: the caller's zones (BHW) or NULL for all zones (Midwife)
CREATE FUNCTION masterlist(p_category text, p_zone_ids bigint[] DEFAULT NULL)
RETURNS SETOF v_active_residents
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF p_category NOT IN ('SENIOR_CITIZEN', 'UNDER_FIVE', 'PREGNANT', 'PWD') THEN
    RAISE EXCEPTION 'Unknown masterlist category: %', p_category USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT v.* FROM v_active_residents v
     WHERE (p_zone_ids IS NULL OR v.zone_id = ANY (p_zone_ids))
       AND CASE p_category
             WHEN 'SENIOR_CITIZEN' THEN v.age_years >= 60
             WHEN 'UNDER_FIVE'     THEN v.age_years < 5
             WHEN 'PREGNANT'       THEN v.is_pregnant
             WHEN 'PWD'            THEN v.is_pwd
           END
     ORDER BY v.zone_name, v.last_name, v.first_name;
END $$;

-- Fuzzy duplicate check to call BEFORE inserting: same birth date and a
-- similar name (catches spelling variants the exact-match index cannot).
CREATE FUNCTION find_possible_duplicates(
  p_last_name text, p_first_name text, p_birth_date date,
  p_exclude_id bigint DEFAULT NULL, p_threshold real DEFAULT 0.5)
RETURNS TABLE (resident_id bigint, household_id bigint, household_no text,
               last_name text, first_name text, middle_name text,
               birth_date date, name_similarity real)
LANGUAGE sql STABLE AS $$
  SELECT r.id, r.household_id, h.household_no, r.last_name, r.first_name,
         r.middle_name, r.birth_date,
         similarity(lower(r.last_name || ' ' || r.first_name),
                    lower(p_last_name || ' ' || p_first_name)) AS name_similarity
    FROM residents r
    JOIN households h ON h.id = r.household_id
   WHERE r.is_active
     AND r.birth_date = p_birth_date
     AND (p_exclude_id IS NULL OR r.id <> p_exclude_id)
     AND similarity(lower(r.last_name || ' ' || r.first_name),
                    lower(p_last_name || ' ' || p_first_name)) >= p_threshold
   ORDER BY name_similarity DESC
$$;

COMMIT;
