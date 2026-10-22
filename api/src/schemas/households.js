import { z } from 'zod';
import { residentCreateSchema } from './residents.js';

export const WaterSourceCodeEnum = z.enum(['LV1', 'LV2', 'LV3', 'O']);
export const ToiletFacilityCodeEnum = z.enum(['P', 'PF', 'VIP', 'WS', 'OH', 'OP', 'WO']);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const householdNoRegex = /^[0-9]{6}-[A-Za-z0-9]+-[0-9]{5}$/;

export const householdCreateSchema = z.object({
  household_no: z
    .string()
    .regex(householdNoRegex, 'Household number must match format yyyymm-FacilityCode-00000'),
  date_of_visit: z
    .string()
    .regex(dateRegex, 'Date of visit must be YYYY-MM-DD')
    .refine(
      (d) => new Date(d) <= new Date(),
      { message: 'Date of visit cannot be in the future' }
    ),
  zone_id: z.number().int().positive('Zone ID must be a positive integer'),
  address_line: z.string().max(200).nullable().optional(),
  water_source_code: WaterSourceCodeEnum.nullable().optional(),
  toilet_facility_code: ToiletFacilityCodeEnum.nullable().optional(),
  is_4ps_household: z.boolean().default(false),
  fourps_household_id: z.string().max(100).nullable().optional(),
  reviewed_by_name: z.string().max(150).nullable().optional(),
  members: z
    .array(residentCreateSchema)
    .min(1, 'Household must have at least one member'),
})
.refine(
  (data) => {
    const headCount = data.members.filter((m) => m.relation_to_head === 'HEAD').length;
    return headCount === 1;
  },
  {
    message: 'A household must have exactly one head.',
    path: ['members'],
  }
)
.refine(
  (data) => data.is_4ps_household || !data.fourps_household_id,
  {
    message: 'fourps_household_id is allowed only when is_4ps_household is true',
    path: ['fourps_household_id'],
  }
);
