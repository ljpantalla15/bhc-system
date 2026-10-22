import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { assertRecordZoneAccess } from '../middleware/zoneAccess.js';
import { AppError } from '../middleware/errorHandler.js';
import { residentUpdateSchema, residentSearchQuerySchema } from '../schemas/residents.js';

export const residentsRouter = Router();

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
 * Helper to fetch a resident object with all computed and joined attributes.
 */
export async function getResidentRecord(residentId) {
  const rRes = await query(
    `SELECT r.*,
            h.household_no, h.zone_id, z.zone_name,
            age_years(r.birth_date) AS age_years,
            age_months(r.birth_date) AS age_months,
            age_risk_group(r.birth_date) AS age_risk_group,
            dt.label AS disability_type
       FROM residents r
       JOIN households h ON h.id = r.household_id
       JOIN zones z ON z.id = h.zone_id
       LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
      WHERE r.id = $1`,
    [residentId]
  );

  if (rRes.rows.length === 0) {
    return null;
  }

  const r = rRes.rows[0];

  // Fetch conditions
  const condRes = await query(
    `SELECT condition_code, other_specify
       FROM resident_medical_conditions
      WHERE resident_id = $1
      ORDER BY condition_code`,
    [residentId]
  );

  return {
    id: parseInt(r.id, 10),
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
    disability_type: r.disability_type,
    medical_conditions: condRes.rows.map((c) => ({
      condition_code: c.condition_code,
      other_specify: c.other_specify,
    })),
    is_active: r.is_active,
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
  };
}

/**
 * GET /api/residents
 * Search and list residents with filters, zone scoping, and pagination.
 * Access: BHW (own zones), Midwife (all zones).
 */
residentsRouter.get(
  '/',
  requireAuth,
  requireRole('BHW', 'MIDWIFE'),
  async (req, res, next) => {
    try {
      const qp = residentSearchQuerySchema.parse(req.query);
      const user = req.user;

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      // Active status filter
      if (!qp.include_inactive) {
        conditions.push(`r.is_active = true AND h.is_active = true`);
      }

      // Zone filtering logic
      if (user.role === 'BHW') {
        const assigned = user.zone_ids || [];
        if (qp.zone_id != null) {
          if (!assigned.includes(qp.zone_id)) {
            throw new AppError(403, 'forbidden', 'You do not have access to this zone.');
          }
          conditions.push(`h.zone_id = $${paramIndex++}`);
          params.push(qp.zone_id);
        } else {
          conditions.push(`h.zone_id = ANY($${paramIndex++}::bigint[])`);
          params.push(assigned);
        }
      } else if (user.role === 'MIDWIFE') {
        if (qp.zone_id != null) {
          conditions.push(`h.zone_id = $${paramIndex++}`);
          params.push(qp.zone_id);
        }
      }

      // Household filter
      if (qp.household_id != null) {
        conditions.push(`r.household_id = $${paramIndex++}`);
        params.push(qp.household_id);
      }

      // Age risk group filter
      if (qp.age_risk_group != null) {
        conditions.push(`age_risk_group(r.birth_date) = $${paramIndex++}`);
        params.push(qp.age_risk_group);
      }

      // Fuzzy / substring name search
      if (qp.q != null && qp.q.trim() !== '') {
        const searchTerm = qp.q.trim();
        conditions.push(
          `(lower(r.last_name || ' ' || r.first_name) ILIKE '%' || lower($${paramIndex}) || '%'
            OR similarity(lower(r.last_name || ' ' || r.first_name), lower($${paramIndex})) >= 0.3)`
        );
        params.push(searchTerm);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countSql = `
        SELECT count(*)::int AS total
          FROM residents r
          JOIN households h ON h.id = r.household_id
         ${whereClause}
      `;
      const countRes = await query(countSql, params);
      const total = countRes.rows[0].total;

      // Fetch page
      const offset = (qp.page - 1) * qp.page_size;
      const fetchParams = [...params, qp.page_size, offset];
      const fetchSql = `
        SELECT r.*,
               h.household_no, h.zone_id, z.zone_name,
               age_years(r.birth_date) AS age_years,
               age_months(r.birth_date) AS age_months,
               age_risk_group(r.birth_date) AS age_risk_group,
               dt.label AS disability_type
          FROM residents r
          JOIN households h ON h.id = r.household_id
          JOIN zones z ON z.id = h.zone_id
          LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
         ${whereClause}
         ORDER BY r.last_name, r.first_name, r.id
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const fetchRes = await query(fetchSql, fetchParams);

      // Fetch conditions for all returned residents
      const residentIds = fetchRes.rows.map((r) => r.id);
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

      const items = fetchRes.rows.map((r) => ({
        id: parseInt(r.id, 10),
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
        disability_type: r.disability_type,
        medical_conditions: conditionsByResident[r.id] || [],
        is_active: r.is_active,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));

      return res.status(200).json({
        items,
        page: qp.page,
        page_size: qp.page_size,
        total,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/residents/:id
 * Updates an active resident record and replaces medical conditions if provided.
 * Access: BHW (own zones only).
 */
residentsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('BHW'),
  async (req, res, next) => {
    try {
      const residentId = parseInt(req.params.id, 10);
      if (isNaN(residentId) || residentId < 1) {
        throw new AppError(400, 'validation_failed', 'Invalid resident ID.');
      }

      const data = residentUpdateSchema.parse(req.body);

      // Verify resident exists and check zone
      const checkRes = await query(
        `SELECT r.id, h.zone_id, r.is_active, r.last_name, r.first_name, r.birth_date
           FROM residents r
           JOIN households h ON h.id = r.household_id
          WHERE r.id = $1`,
        [residentId]
      );

      if (checkRes.rows.length === 0 || !checkRes.rows[0].is_active) {
        throw new AppError(404, 'not_found', 'Resident not found.');
      }

      const current = checkRes.rows[0];
      assertRecordZoneAccess(req.user, current.zone_id, 'Resident');

      // Duplicate check if name or birth date changed
      const newLastName = data.last_name || current.last_name;
      const newFirstName = data.first_name || current.first_name;
      const newBirthDate = data.birth_date || formatDate(current.birth_date);

      if (data.last_name || data.first_name || data.birth_date) {
        const dupRes = await query(
          'SELECT * FROM find_possible_duplicates($1, $2, $3, $4, 0.95)',
          [newLastName, newFirstName, newBirthDate, residentId]
        );
        if (dupRes.rows.length > 0) {
          throw new AppError(
            400,
            'duplicate_resident',
            'A resident with the same name and birth date already exists.'
          );
        }
      }

      // Execute update in transaction
      await withTransaction(req.user, async (client) => {
        // Collect updatable fields
        const updatableFields = [
          'last_name',
          'first_name',
          'middle_name',
          'relation_to_head',
          'relation_other',
          'birth_date',
          'sex',
          'civil_status_code',
          'education_code',
          'religion_code',
          'religion_other',
          'ethnic_group',
          'occupation',
          'philhealth_id',
          'philhealth_membership',
          'philhealth_category',
          'is_pregnant',
          'lmp_date',
          'uses_fp',
          'fp_method_code',
          'fp_method_other',
          'fp_status_code',
          'is_pwd',
          'disability_type_code',
        ];

        const setClauses = [];
        const params = [];
        let pIndex = 1;

        for (const field of updatableFields) {
          if (data[field] !== undefined) {
            setClauses.push(`${field} = $${pIndex++}`);
            params.push(data[field]);
          }
        }

        if (setClauses.length > 0) {
          params.push(residentId);
          const updateSql = `UPDATE residents SET ${setClauses.join(', ')} WHERE id = $${pIndex}`;
          await client.query(updateSql, params);
        }

        // Replace medical conditions if sent
        if (data.medical_conditions !== undefined) {
          await client.query(
            'DELETE FROM resident_medical_conditions WHERE resident_id = $1',
            [residentId]
          );

          for (const mc of data.medical_conditions) {
            await client.query(
              `INSERT INTO resident_medical_conditions (resident_id, condition_code, other_specify)
               VALUES ($1, $2, $3)`,
              [residentId, mc.condition_code, mc.other_specify || null]
            );
          }
        }
      });

      const updatedResident = await getResidentRecord(residentId);
      return res.status(200).json(updatedResident);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/residents/:id
 * Deactivates a resident (logical delete).
 * Access: BHW (own zones only).
 */
residentsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('BHW'),
  async (req, res, next) => {
    try {
      const residentId = parseInt(req.params.id, 10);
      if (isNaN(residentId) || residentId < 1) {
        throw new AppError(400, 'validation_failed', 'Invalid resident ID.');
      }

      const reason = req.query.reason ? String(req.query.reason).slice(0, 200) : null;

      // Check current resident and zone
      const checkRes = await query(
        `SELECT r.id, h.zone_id, r.is_active
           FROM residents r
           JOIN households h ON h.id = r.household_id
          WHERE r.id = $1`,
        [residentId]
      );

      if (checkRes.rows.length === 0 || !checkRes.rows[0].is_active) {
        throw new AppError(404, 'not_found', 'Resident not found.');
      }

      assertRecordZoneAccess(req.user, checkRes.rows[0].zone_id, 'Resident');

      // Execute logical deactivation within transaction
      await withTransaction(req.user, async (client) => {
        await client.query(
          `UPDATE residents
              SET is_active = false,
                  deactivation_reason = $1
            WHERE id = $2`,
          [reason, residentId]
        );
      });

      const deactivatedResident = await getResidentRecord(residentId);
      return res.status(200).json(deactivatedResident);
    } catch (err) {
      next(err);
    }
  }
);
