import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { AppError } from '../middleware/errorHandler.js';
import { masterlistQuerySchema } from '../schemas/masterlists.js';

export const masterlistsRouter = Router();

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
 * GET /api/masterlists
 * Generates a masterlist by category and zone scoping.
 * Access: BHW (own zones), Midwife (all zones).
 */
masterlistsRouter.get(
  '/',
  requireAuth,
  requireRole('BHW', 'MIDWIFE'),
  async (req, res, next) => {
    try {
      const qp = masterlistQuerySchema.parse(req.query);
      const user = req.user;

      let effectiveZoneIds;

      if (user.role === 'BHW') {
        const assigned = user.zone_ids || [];
        if (qp.zone_id != null) {
          if (!assigned.includes(qp.zone_id)) {
            throw new AppError(403, 'forbidden', 'You do not have access to this zone.');
          }
          effectiveZoneIds = [qp.zone_id];
        } else {
          effectiveZoneIds = assigned;
        }
      } else if (user.role === 'MIDWIFE') {
        if (qp.zone_id != null) {
          effectiveZoneIds = [qp.zone_id];
        } else {
          effectiveZoneIds = null; // Midwife gets all zones
        }
      }

      // Execute database function masterlist(category, zone_ids)
      const listRes = await query(
        'SELECT * FROM masterlist($1, $2)',
        [qp.category, effectiveZoneIds]
      );

      // Fetch conditions for all returned residents
      const residentIds = listRes.rows.map((r) => r.resident_id);
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

      const items = listRes.rows.map((r) => ({
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
        disability_type: r.disability_type,
        medical_conditions: conditionsByResident[r.resident_id] || [],
        is_active: true,
        created_at: new Date(r.date_of_visit).toISOString(),
        updated_at: new Date(r.date_of_visit).toISOString(),
      }));

      const response = {
        category: qp.category,
        generated_at: new Date().toISOString(),
        total: items.length,
        items,
      };

      if (effectiveZoneIds != null) {
        response.zone_ids = effectiveZoneIds;
      }

      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
