import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireZoneAccess, assertRecordZoneAccess } from '../middleware/zoneAccess.js';
import { AppError } from '../middleware/errorHandler.js';
import { householdCreateSchema } from '../schemas/households.js';

export const householdsRouter = Router();

function formatDate(d) {
  if (!d) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d).slice(0, 10);
}

/**
 * Helper to fetch a full household and its active members by ID.
 */
export async function getHouseholdRecord(householdId) {
  const hRes = await query(
    `SELECT h.*, z.zone_name
       FROM households h
       JOIN zones z ON z.id = h.zone_id
      WHERE h.id = $1 AND h.is_active = true`,
    [householdId]
  );

  if (hRes.rows.length === 0) {
    return null;
  }

  const h = hRes.rows[0];

  // Fetch active members from view v_active_residents
  const mRes = await query(
    `SELECT r.*, dt.label AS dt_label
       FROM v_active_residents r
       LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
      WHERE r.household_id = $1
      ORDER BY
        CASE r.relation_to_head
          WHEN 'HEAD' THEN 1
          WHEN 'SPOUSE' THEN 2
          WHEN 'SON' THEN 3
          WHEN 'DAUGHTER' THEN 4
          ELSE 5
        END,
        r.birth_date ASC`,
    [householdId]
  );

  // Fetch medical conditions for each member
  const residentIds = mRes.rows.map((r) => r.resident_id);
  const conditionsByResident = {};

  if (residentIds.length > 0) {
    const condRes = await query(
      `SELECT resident_id, condition_code, other_specify
         FROM resident_medical_conditions
        WHERE resident_id = ANY($1::bigint[])
        ORDER BY resident_id, condition_code`,
      [residentIds]
    );
    for (const c of condRes.rows) {
      if (!conditionsByResident[c.resident_id]) {
        conditionsByResident[c.resident_id] = [];
      }
      conditionsByResident[c.resident_id].push({
        condition_code: c.condition_code,
        other_specify: c.other_specify,
      });
    }
  }

  const members = mRes.rows.map((r) => ({
    id: parseInt(r.resident_id, 10),
    household_id: parseInt(r.household_id, 10),
    household_no: r.household_no,
    zone_id: parseInt(r.zone_id, 10),
    zone_name: r.zone_name,
    last_name: r.last_name,
    first_name: r.first_name,
    middle_name: r.middle_name,
    relation_to_head: r.relation_to_head,
    relation_other: r.relation_other,
    birth_date: formatDate(r.birth_date),
    age_years: parseInt(r.age_years, 10),
    age_months: parseInt(r.age_months, 10),
    age_risk_group: r.age_risk_group,
    sex: r.sex,
    civil_status_code: r.civil_status_code,
    education_code: r.education_code,
    religion_code: r.religion_code,
    religion_other: r.religion_other,
    ethnic_group: r.ethnic_group,
    occupation: r.occupation,
    philhealth_id: r.philhealth_id,
    philhealth_membership: r.philhealth_membership,
    philhealth_category: r.philhealth_category,
    is_pregnant: r.is_pregnant,
    lmp_date: formatDate(r.lmp_date),
    uses_fp: r.uses_fp,
    fp_method_code: r.fp_method_code,
    fp_method_other: r.fp_method_other,
    fp_status_code: r.fp_status_code,
    is_pwd: r.is_pwd,
    disability_type_code: r.disability_type_code,
    disability_type: r.disability_type || r.dt_label,
    medical_conditions: conditionsByResident[r.resident_id] || [],
    is_active: true,
    created_at: new Date(r.date_of_visit).toISOString(),
    updated_at: new Date(r.date_of_visit).toISOString(),
  }));

  return {
    id: parseInt(h.id, 10),
    household_no: h.household_no,
    date_of_visit: formatDate(h.date_of_visit),
    visit_quarter: parseInt(h.visit_quarter, 10),
    zone_id: parseInt(h.zone_id, 10),
    zone_name: h.zone_name,
    address_line: h.address_line,
    barangay: h.barangay,
    municipality_city: h.municipality_city,
    province: h.province,
    water_source_code: h.water_source_code,
    toilet_facility_code: h.toilet_facility_code,
    is_4ps_household: h.is_4ps_household,
    fourps_household_id: h.fourps_household_id,
    interviewed_by: parseInt(h.interviewed_by, 10),
    reviewed_by_name: h.reviewed_by_name,
    is_active: h.is_active,
    members,
    created_at: new Date(h.created_at).toISOString(),
    updated_at: new Date(h.updated_at).toISOString(),
  };
}

/**
 * POST /api/households
 * Encodes a household, its members, and their medical conditions in one transaction.
 * Access: BHW (own assigned zones).
 */
householdsRouter.post(
  '/',
  requireAuth,
  requireRole('BHW'),
  requireZoneAccess((req) => req.body?.zone_id),
  async (req, res, next) => {
    try {
      const data = householdCreateSchema.parse(req.body);

      // Duplicate check before insertion
      for (let i = 0; i < data.members.length; i++) {
        const m = data.members[i];
        const dupRes = await query(
          'SELECT * FROM find_possible_duplicates($1, $2, $3, NULL, 0.9)',
          [m.last_name, m.first_name, m.birth_date]
        );

        if (dupRes.rows.length > 0) {
          const match = dupRes.rows[0];
          throw new AppError(
            400,
            'duplicate_resident',
            'A resident with the same name and birth date already exists.',
            [
              {
                field: `members[${i}]`,
                issue: `Matches an active resident in household ${match.household_no}`,
              },
            ]
          );
        }
      }

      // Execute entire creation in one transaction via withTransaction helper
      const newHouseholdId = await withTransaction(req.user, async (client) => {
        // 1. Insert household
        const hRes = await client.query(
          `INSERT INTO households (
             household_no, date_of_visit, zone_id, address_line,
             water_source_code, toilet_facility_code, is_4ps_household, fourps_household_id,
             reviewed_by_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            data.household_no,
            data.date_of_visit,
            data.zone_id,
            data.address_line || null,
            data.water_source_code || null,
            data.toilet_facility_code || null,
            data.is_4ps_household,
            data.fourps_household_id || null,
            data.reviewed_by_name || null,
          ]
        );
        const householdId = hRes.rows[0].id;

        // 2. Insert members
        for (const m of data.members) {
          const rRes = await client.query(
            `INSERT INTO residents (
               household_id, last_name, first_name, middle_name,
               relation_to_head, relation_other, birth_date, sex,
               civil_status_code, education_code, religion_code, religion_other,
               ethnic_group, occupation, philhealth_id, philhealth_membership, philhealth_category,
               is_pregnant, lmp_date, uses_fp, fp_method_code, fp_method_other, fp_status_code,
               is_pwd, disability_type_code
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
               $21, $22, $23, $24, $25
             )
             RETURNING id`,
            [
              householdId,
              m.last_name,
              m.first_name,
              m.middle_name || null,
              m.relation_to_head,
              m.relation_other || null,
              m.birth_date,
              m.sex,
              m.civil_status_code,
              m.education_code,
              m.religion_code || null,
              m.religion_other || null,
              m.ethnic_group || null,
              m.occupation || null,
              m.philhealth_id || null,
              m.philhealth_membership || null,
              m.philhealth_category || null,
              m.is_pregnant || false,
              m.lmp_date || null,
              m.uses_fp == null ? null : m.uses_fp,
              m.fp_method_code || null,
              m.fp_method_other || null,
              m.fp_status_code || null,
              m.is_pwd || false,
              m.disability_type_code || null,
            ]
          );
          const residentId = rRes.rows[0].id;

          // 3. Insert medical conditions
          if (m.medical_conditions && m.medical_conditions.length > 0) {
            for (const mc of m.medical_conditions) {
              await client.query(
                `INSERT INTO resident_medical_conditions (resident_id, condition_code, other_specify)
                 VALUES ($1, $2, $3)`,
                [residentId, mc.condition_code, mc.other_specify || null]
              );
            }
          }
        }

        return householdId;
      });

      // Fetch the full household record
      const fullHousehold = await getHouseholdRecord(newHouseholdId);
      res.setHeader('Location', `/api/households/${newHouseholdId}`);
      return res.status(201).json(fullHousehold);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id
 * Views a household and its active members.
 * Access: BHW (own zones), Midwife (all zones).
 */
householdsRouter.get(
  '/:id',
  requireAuth,
  requireRole('BHW', 'MIDWIFE'),
  async (req, res, next) => {
    try {
      const householdId = parseInt(req.params.id, 10);
      if (isNaN(householdId) || householdId < 1) {
        throw new AppError(400, 'validation_failed', 'Invalid household ID.');
      }

      // Check header exists
      const headerRes = await query(
        'SELECT id, zone_id, is_active FROM households WHERE id = $1',
        [householdId]
      );

      if (headerRes.rows.length === 0 || !headerRes.rows[0].is_active) {
        throw new AppError(404, 'not_found', 'Household not found.');
      }

      // Check zone access (BHW outside zone gets 404 concealing existence)
      assertRecordZoneAccess(req.user, headerRes.rows[0].zone_id, 'Household');

      const fullHousehold = await getHouseholdRecord(householdId);
      if (!fullHousehold) {
        throw new AppError(404, 'not_found', 'Household not found.');
      }

      return res.status(200).json(fullHousehold);
    } catch (err) {
      next(err);
    }
  }
);
