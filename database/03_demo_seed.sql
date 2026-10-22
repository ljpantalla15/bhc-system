-- =============================================================================
-- File 3 of 3: SYNTHETIC demo data (fictional people, fictional numbers)
-- For development, testing, and the controlled-environment demonstration only.
-- Demo login for every account below: password  Demo#12345
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- bcrypt hashing for the demo accounts

INSERT INTO zones (zone_name, description) VALUES
  ('Purok 1', 'Synthetic zone'), ('Purok 2', 'Synthetic zone'), ('Purok 3', 'Synthetic zone');

INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin1',   crypt('Demo#12345', gen_salt('bf', 10)), 'Demo Administrator', 'ADMIN'),
  ('midwife1', crypt('Demo#12345', gen_salt('bf', 10)), 'Demo Midwife',       'MIDWIFE'),
  ('bhw1',     crypt('Demo#12345', gen_salt('bf', 10)), 'Demo BHW One',       'BHW'),
  ('bhw2',     crypt('Demo#12345', gen_salt('bf', 10)), 'Demo BHW Two',       'BHW');

INSERT INTO user_zone_assignments (user_id, zone_id)
SELECT u.id, z.id FROM users u, zones z
 WHERE (u.username = 'bhw1' AND z.zone_name = 'Purok 1')
    OR (u.username = 'bhw2' AND z.zone_name IN ('Purok 2', 'Purok 3'));

DO $$
DECLARE
  v_ym text := to_char(CURRENT_DATE - 6, 'YYYYMM');
  h1 bigint; h2 bigint; h3 bigint;
BEGIN
  -- ---- encoded by bhw1 (Purok 1) ----
  PERFORM set_config('app.current_user_id', (SELECT id::text FROM users WHERE username = 'bhw1'), false);

  INSERT INTO households (household_no, date_of_visit, zone_id, water_source_code, toilet_facility_code)
  VALUES (v_ym || '-TAGO-00001', CURRENT_DATE - 6,
          (SELECT id FROM zones WHERE zone_name = 'Purok 1'), 'LV3', 'P')
  RETURNING id INTO h1;

  INSERT INTO residents (household_id, last_name, first_name, middle_name, relation_to_head, relation_other,
                         birth_date, sex, civil_status_code, education_code, religion_code, ethnic_group,
                         occupation, philhealth_id, philhealth_membership, philhealth_category,
                         is_pregnant, lmp_date, uses_fp) VALUES
    (h1, 'Reyes', 'Antonio', 'Santos', 'HEAD', NULL, (CURRENT_DATE - INTERVAL '68 years 3 months')::date,
         'M', 'M', 'HG', 'RC', 'NON_IP', 'Retired', '100000000001', 'MEMBER', 'INDIRECT', false, NULL, NULL),
    (h1, 'Reyes', 'Luisa', 'Cruz', 'SPOUSE', NULL, (CURRENT_DATE - INTERVAL '65 years 1 month')::date,
         'F', 'M', 'EG', 'RC', 'NON_IP', 'Housewife', '100000000002', 'DEPENDENT', NULL, false, NULL, false),
    (h1, 'Reyes', 'Maria', 'Cruz', 'DAUGHTER', NULL, (CURRENT_DATE - INTERVAL '32 years 5 months')::date,
         'F', 'S', 'CG', 'RC', 'NON_IP', 'Teacher', NULL, NULL, NULL, true, CURRENT_DATE - 100, false),
    (h1, 'Reyes', 'Jose', 'Cruz', 'OTHER', 'Grandson', (CURRENT_DATE - INTERVAL '3 years 4 months')::date,
         'M', 'S', 'N', 'RC', 'NON_IP', NULL, NULL, NULL, NULL, false, NULL, NULL);

  INSERT INTO resident_medical_conditions (resident_id, condition_code)
  SELECT id, c.code FROM residents r, (VALUES ('HPN'), ('DM')) AS c(code)
   WHERE r.household_id = h1 AND r.first_name = 'Antonio';
  INSERT INTO resident_medical_conditions (resident_id, condition_code)
  SELECT id, 'HPN' FROM residents WHERE household_id = h1 AND first_name = 'Luisa';

  INSERT INTO households (household_no, date_of_visit, zone_id, water_source_code, toilet_facility_code)
  VALUES (v_ym || '-TAGO-00002', CURRENT_DATE - 5,
          (SELECT id FROM zones WHERE zone_name = 'Purok 1'), 'LV2', 'P')
  RETURNING id INTO h2;

  INSERT INTO residents (household_id, last_name, first_name, middle_name, relation_to_head,
                         birth_date, sex, civil_status_code, education_code, religion_code, ethnic_group,
                         occupation, is_pwd, disability_type_code, uses_fp, fp_method_code, fp_status_code) VALUES
    (h2, 'Mendoza', 'Ramon', 'Villanueva', 'HEAD', (CURRENT_DATE - INTERVAL '41 years 2 months')::date,
         'M', 'M', 'HG', 'RC', 'NON_IP', 'Tricycle driver', true, 'ORTHO', NULL, NULL, NULL),
    (h2, 'Mendoza', 'Elena', 'Garcia', 'SPOUSE', (CURRENT_DATE - INTERVAL '38 years 7 months')::date,
         'F', 'M', 'CU', 'RC', 'NON_IP', 'Vendor', false, NULL, true, 'IUD', 'CU'),
    (h2, 'Mendoza', 'Carlo', 'Garcia', 'SON', (CURRENT_DATE - INTERVAL '9 years 1 month')::date,
         'M', 'S', 'ES', 'RC', 'NON_IP', NULL, false, NULL, NULL, NULL, NULL),
    (h2, 'Mendoza', 'Bea', 'Garcia', 'DAUGHTER', (CURRENT_DATE - INTERVAL '10 months')::date,
         'F', 'S', 'N', 'RC', 'NON_IP', NULL, false, NULL, NULL, NULL, NULL);

  -- ---- encoded by bhw2 (Purok 2) ----
  PERFORM set_config('app.current_user_id', (SELECT id::text FROM users WHERE username = 'bhw2'), false);

  INSERT INTO households (household_no, date_of_visit, zone_id, water_source_code, toilet_facility_code,
                          is_4ps_household, fourps_household_id)
  VALUES (v_ym || '-TAGO-00003', CURRENT_DATE - 4,
          (SELECT id FROM zones WHERE zone_name = 'Purok 2'), 'LV1', 'WS', true, 'SYN-4PS-0001')
  RETURNING id INTO h3;

  INSERT INTO residents (household_id, last_name, first_name, middle_name, relation_to_head, relation_other,
                         birth_date, sex, civil_status_code, education_code, religion_code, ethnic_group,
                         occupation) VALUES
    (h3, 'Bautista', 'Rosa', 'Dela Cruz', 'HEAD', NULL, (CURRENT_DATE - INTERVAL '29 years 6 months')::date,
         'F', 'C', 'HG', 'INC', 'NON_IP', 'Laundrywoman'),
    (h3, 'Lim', 'Leo', 'Tan', 'OTHER', 'Partner', (CURRENT_DATE - INTERVAL '31 years')::date,
         'M', 'C', 'HU', 'INC', 'NON_IP', 'Construction worker'),
    (h3, 'Bautista', 'Ana', 'Dela Cruz', 'DAUGHTER', NULL, (CURRENT_DATE - INTERVAL '4 years 2 months')::date,
         'F', 'S', 'PS', 'INC', 'NON_IP', NULL);

  PERFORM set_config('app.current_user_id', '', false);
END $$;
