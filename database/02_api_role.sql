-- =============================================================================
-- File 2 of 3: least-privilege database role for the Express API
--
-- The API should connect as bhc_api, NOT as the superuser. This role has no
-- DELETE on residents/households/users, so "deactivate, don't delete" is
-- enforced by the database too, and it cannot touch change_log directly.
--
-- Change the password before use (or: ALTER ROLE bhc_api PASSWORD '...').
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bhc_api') THEN
    CREATE ROLE bhc_api LOGIN PASSWORD 'change_me_before_use';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO bhc_api;

-- Read-only reference data
GRANT SELECT ON civil_statuses, education_levels, religions, medical_conditions, disability_types,
                fp_methods, fp_statuses, water_source_types, toilet_facility_types,
                zones TO bhc_api;

-- Core data: create and update only (no DELETE)
GRANT SELECT, INSERT, UPDATE ON users, households, residents, auth_sessions TO bhc_api;

-- Link tables: rows are added and removed when assignments/conditions change
GRANT SELECT, INSERT, DELETE ON user_zone_assignments, resident_medical_conditions TO bhc_api;

-- Change log: read-only for the API; rows are written by the log_change() trigger
GRANT SELECT ON change_log TO bhc_api;

-- Reporting
GRANT SELECT ON v_active_residents TO bhc_api;
GRANT EXECUTE ON FUNCTION masterlist(text, bigint[]),
                          find_possible_duplicates(text, text, date, bigint, real),
                          age_years(date, date), age_months(date, date),
                          age_risk_group(date, date), app_user_id() TO bhc_api;
