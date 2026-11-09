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
            dt.label AS disability_type,
            du.full_name AS deactivated_by_name,
            uu.full_name AS updated_by_name
       FROM residents r
       JOIN households h ON h.id = r.household_id
       JOIN zones z ON z.id = h.zone_id
       LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
       LEFT JOIN users du ON du.id = r.deactivated_by
       LEFT JOIN users uu ON uu.id = COALESCE(r.updated_by, r.created_by)
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
    deactivated_at: r.deactivated_at ? new Date(r.deactivated_at).toISOString() : null,
    deactivated_by_name: r.deactivated_by_name || null,
    deactivation_reason: r.deactivation_reason || null,
    created_at: new Date(r.created_at).toISOString(),
    updated_at: new Date(r.updated_at).toISOString(),
    updated_by_name: r.updated_by_name || null,
  };
}

/**
 * GET /api/residents
 * Search and list residents with filters, zone scoping, and pagination.
 * Access: BHW (own zones), Midwife (all zones).
 *
 * group_by=household keeps the members of a household together: the list is
 * ordered household first (head, spouse, children by age) and the page is
 * counted in households, so a household is never split across two pages.
 */
residentsRouter.get(
  '/',
  requireAuth,
  requireRole('BHW', 'MIDWIFE'),
  async (req, res, next) => {
    try {
      const qp = residentSearchQuerySchema.parse(req.query);
      const user = req.user;
      const grouped = qp.group_by === 'household';

      const conditions = [];
      const params = [];
      let paramIndex = 1;

      // Active status filter: active (default), archived, or all.
      // include_inactive=true is the older spelling of status=all.
      const status = qp.status ?? (qp.include_inactive ? 'all' : 'active');
      if (status === 'active') {
        conditions.push(`r.is_active = true AND h.is_active = true`);
      } else if (status === 'archived') {
        conditions.push(`r.is_active = false`);
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
      const andClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      // Count residents and households in scope
      const countSql = `
        SELECT count(*)::int AS total_residents,
               count(DISTINCT r.household_id)::int AS total_households
          FROM residents r
          JOIN households h ON h.id = r.household_id
         ${whereClause}
      `;
      const countRes = await query(countSql, params);
      const totalResidents = countRes.rows[0].total_residents;
      const totalHouseholds = countRes.rows[0].total_households;

      // Order that keeps a household together: head, spouse, children by age.
      const householdOrder = `
        h.household_no,
        CASE r.relation_to_head
          WHEN 'HEAD' THEN 1
          WHEN 'SPOUSE' THEN 2
          WHEN 'SON' THEN 3
          WHEN 'DAUGHTER' THEN 4
          ELSE 5
        END,
        r.birth_date ASC,
        r.last_name, r.first_name, r.id`;

      let fetchParams;
      let fetchSql;

      if (grouped) {
        // The page is counted in households. Pick the households of this page
        // first, then return their residents that match the filters.
        const offset = (qp.page - 1) * qp.page_size;
        const householdIds = [];

        if (totalHouseholds > 0) {
          const limitIdx = paramIndex++;
          const offsetIdx = paramIndex++;
          const hhSql = `
            SELECT s.household_id
              FROM (
                SELECT DISTINCT r.household_id, h.household_no
                  FROM residents r
                  JOIN households h ON h.id = r.household_id
                 ${whereClause}
              ) s
             ORDER BY s.household_no
             LIMIT $${limitIdx} OFFSET $${offsetIdx}
          `;
          const hhRes = await query(hhSql, [...params, qp.page_size, offset]);
          for (const row of hhRes.rows) householdIds.push(row.household_id);
        }

        if (householdIds.length === 0) {
          return res.status(200).json({
            items: [],
            page: qp.page,
            page_size: qp.page_size,
            total: totalHouseholds,
            total_residents: totalResidents,
            total_households: totalHouseholds,
            group_by: 'household',
          });
        }

        const householdIdx = params.length + 1;
        fetchParams = [...params, householdIds];
        fetchSql = `
          SELECT r.*,
                 h.household_no, h.zone_id, z.zone_name,
                 age_years(r.birth_date) AS age_years,
                 age_months(r.birth_date) AS age_months,
                 age_risk_group(r.birth_date) AS age_risk_group,
                 dt.label AS disability_type,
                 du.full_name AS deactivated_by_name,
                 uu.full_name AS updated_by_name
            FROM residents r
            JOIN households h ON h.id = r.household_id
            JOIN zones z ON z.id = h.zone_id
            LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
            LEFT JOIN users du ON du.id = r.deactivated_by
            LEFT JOIN users uu ON uu.id = COALESCE(r.updated_by, r.created_by)
           WHERE r.household_id = ANY($${householdIdx}::bigint[])
             ${andClause}
           ORDER BY ${householdOrder}
        `;
      } else {
        const offset = (qp.page - 1) * qp.page_size;
        fetchParams = [...params, qp.page_size, offset];
        fetchSql = `
          SELECT r.*,
                 h.household_no, h.zone_id, z.zone_name,
                 age_years(r.birth_date) AS age_years,
                 age_months(r.birth_date) AS age_months,
                 age_risk_group(r.birth_date) AS age_risk_group,
                 dt.label AS disability_type,
                 du.full_name AS deactivated_by_name,
                 uu.full_name AS updated_by_name
            FROM residents r
            JOIN households h ON h.id = r.household_id
            JOIN zones z ON z.id = h.zone_id
            LEFT JOIN disability_types dt ON dt.code = r.disability_type_code
            LEFT JOIN users du ON du.id = r.deactivated_by
            LEFT JOIN users uu ON uu.id = COALESCE(r.updated_by, r.created_by)
           ${whereClause}
           ORDER BY ${status === 'archived' ? 'r.deactivated_at DESC, r.id DESC' : 'r.last_name, r.first_name, r.id'}
           LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
      }

      const fetchRes = await query(fetchSql, fetchParams);

      // Member counts per household (how many members the household has in total)
      const memberCounts = {};
      const pageHouseholdIds = [...new Set(fetchRes.rows.map((r) => r.household_id))];
      if (pageHouseholdIds.length > 0) {
        const memberSql = `
          SELECT household_id, count(*)::int AS member_count
            FROM residents
           WHERE household_id = ANY($1::bigint[])
             ${status === 'active' ? 'AND is_active = true' : ''}
           GROUP BY household_id
        `;
        const memberRes = await query(memberSql, [pageHouseholdIds]);
        for (const row of memberRes.rows) memberCounts[row.household_id] = row.member_count;
      }

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
        household_member_count: memberCounts[r.household_id] ?? 0,
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
        deactivated_at: r.deactivated_at ? new Date(r.deactivated_at).toISOString() : null,
        deactivated_by_name: r.deactivated_by_name || null,
        deactivation_reason: r.deactivation_reason || null,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        updated_by_name: r.updated_by_name || null,
      }));

      return res.status(200).json({
        items,
        page: qp.page,
        page_size: qp.page_size,
        // The paging unit: residents by default, households when grouped.
        total: grouped ? totalHouseholds : totalResidents,
        total_residents: totalResidents,
        total_households: totalHouseholds,
        group_by: qp.group_by,
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
        } else if (data.medical_conditions !== undefined) {
          // Only the conditions change: still stamp who and when on the resident.
          await client.query('UPDATE residents SET updated_at = now() WHERE id = $1', [residentId]);
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
 * GET /api/residents/:id/history
 * The change history of one resident, newest first: who changed what, and when.
 * Access: BHW (own zones), Midwife (all zones). Archived residents keep their history.
 *
 * Only field NAMES are returned, never the old or new values.
 */
residentsRouter.get(
  '/:id/history',
  requireAuth,
  requireRole('BHW', 'MIDWIFE'),
  async (req, res, next) => {
    try {
      const residentId = parseInt(req.params.id, 10);
      if (isNaN(residentId) || residentId < 1) {
        throw new AppError(400, 'validation_failed', 'Invalid resident ID.');
      }

      const checkRes = await query(
        `SELECT h.zone_id
           FROM residents r
           JOIN households h ON h.id = r.household_id
          WHERE r.id = $1`,
        [residentId]
      );
      if (checkRes.rows.length === 0) {
        throw new AppError(404, 'not_found', 'Resident not found.');
      }
      assertRecordZoneAccess(req.user, checkRes.rows[0].zone_id, 'Resident');

      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size, 10) || 20));
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);

      const where = `cl.record_id = $1
                     AND cl.table_name IN ('residents', 'resident_medical_conditions')`;
      const countRes = await query(`SELECT count(*)::int AS total FROM change_log cl WHERE ${where}`, [residentId]);

      const rowsRes = await query(
        `SELECT cl.id, cl.changed_at, cl.action, cl.table_name, cl.changed_by,
                actor.full_name AS changed_by_name, cl.changed_fields
           FROM change_log cl
           LEFT JOIN users actor ON actor.id = cl.changed_by
          WHERE ${where}
          ORDER BY cl.id DESC
          LIMIT $2 OFFSET $3`,
        [residentId, pageSize, (page - 1) * pageSize]
      );

      return res.status(200).json({
        items: rowsRes.rows.map((r) => ({
          id: parseInt(r.id, 10),
          changed_at: new Date(r.changed_at).toISOString(),
          action: r.action,
          // Medical conditions are stored in their own table; the person reads them as a field.
          changed_fields:
            r.table_name === 'resident_medical_conditions'
              ? ['medical_conditions']
              : r.changed_fields || [],
          changed_by_name: r.changed_by_name || null,
        })),
        page,
        page_size: pageSize,
        total: countRes.rows[0].total,
      });
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

/**
 * POST /api/residents/:id/reactivate
 * Restores an archived (deactivated) resident.
 * Access: BHW (own zones only). The database trigger clears the deactivation
 * stamps and writes a REACTIVATE row to change_log with the user and time.
 */
residentsRouter.post(
  '/:id/reactivate',
  requireAuth,
  requireRole('BHW'),
  async (req, res, next) => {
    try {
      const residentId = parseInt(req.params.id, 10);
      if (isNaN(residentId) || residentId < 1) {
        throw new AppError(400, 'validation_failed', 'Invalid resident ID.');
      }

      const checkRes = await query(
        `SELECT r.id, h.zone_id, h.is_active AS household_active, r.is_active
           FROM residents r
           JOIN households h ON h.id = r.household_id
          WHERE r.id = $1`,
        [residentId]
      );

      if (checkRes.rows.length === 0) {
        throw new AppError(404, 'not_found', 'Resident not found.');
      }

      const current = checkRes.rows[0];
      assertRecordZoneAccess(req.user, current.zone_id, 'Resident');

      if (current.is_active) {
        throw new AppError(400, 'validation_failed', 'This resident is already active.');
      }
      if (!current.household_active) {
        throw new AppError(400, 'validation_failed', 'The household of this resident is deactivated.');
      }

      await withTransaction(req.user, async (client) => {
        await client.query('UPDATE residents SET is_active = true WHERE id = $1', [residentId]);
      });

      const restored = await getResidentRecord(residentId);
      return res.status(200).json(restored);
    } catch (err) {
      next(err);
    }
  }
);
