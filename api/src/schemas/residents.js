import { z } from 'zod';

export const SexEnum = z.enum(['M', 'F']);
export const RelationToHeadEnum = z.enum(['HEAD', 'SPOUSE', 'SON', 'DAUGHTER', 'OTHER']);
export const EthnicGroupEnum = z.enum(['IP', 'NON_IP']);
export const PhilhealthMembershipEnum = z.enum(['MEMBER', 'DEPENDENT']);
export const PhilhealthCategoryEnum = z.enum(['DIRECT', 'INDIRECT']);
export const CivilStatusCodeEnum = z.enum(['M', 'S', 'W', 'SP', 'C']);
export const EducationCodeEnum = z.enum([
  'N', 'PS', 'ES', 'EU', 'EG', 'HS', 'HU', 'HG', 'SH', 'ALS', 'V', 'CS', 'CU', 'CG', 'PG'
]);
export const ReligionCodeEnum = z.enum([
  'RC', 'CHR', 'INC', 'ISL', 'BAP', 'BAC', 'BUD', 'COG', 'JW', 'PRO', 'SDA', 'LDS', 'EVA', 'PEN', 'UNK', 'OTH'
]);
export const MedicalConditionCodeEnum = z.enum(['HPN', 'DM', 'TB', 'OTH']);
export const DisabilityTypeCodeEnum = z.enum([
  'LD', 'SPEECH', 'PHYS', 'ORTHO', 'VISUAL', 'DHH', 'INTEL', 'PSYCHO', 'MENTAL', 'CANCER', 'RARE'
]);
export const FpMethodCodeEnum = z.enum([
  'COC', 'POP', 'INJ', 'WD', 'IUD', 'CON', 'LAM', 'BTL', 'IMP', 'SDM', 'DPT', 'OTH'
]);
export const FpStatusCodeEnum = z.enum(['NA', 'CU', 'CM', 'CC', 'DO', 'R']);

export const medicalConditionSchema = z.object({
  condition_code: MedicalConditionCodeEnum,
  other_specify: z.string().max(100).nullable().optional(),
}).refine(
  (data) => data.condition_code !== 'OTH' || (data.other_specify && data.other_specify.trim() !== ''),
  {
    message: "other_specify is required when condition_code is 'OTH'",
    path: ['other_specify'],
  }
);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const residentCreateSchema = z.object({
  last_name: z.string().min(1, 'Last name is required').max(100),
  first_name: z.string().min(1, 'First name is required').max(100),
  middle_name: z.string().max(100).nullable().optional(),
  relation_to_head: RelationToHeadEnum,
  relation_other: z.string().max(100).nullable().optional(),
  birth_date: z.string().regex(dateRegex, 'Birth date must be YYYY-MM-DD').refine(
    (d) => {
      const birth = new Date(d);
      const minDate = new Date('1900-01-01');
      const now = new Date();
      return birth >= minDate && birth <= now;
    },
    { message: 'Birth date must be between 1900-01-01 and today' }
  ),
  sex: SexEnum,
  civil_status_code: CivilStatusCodeEnum,
  education_code: EducationCodeEnum,
  religion_code: ReligionCodeEnum.nullable().optional(),
  religion_other: z.string().max(100).nullable().optional(),
  ethnic_group: EthnicGroupEnum.nullable().optional(),
  occupation: z.string().max(100).nullable().optional(),
  philhealth_id: z.string().regex(/^[0-9]{12}$/, 'PhilHealth ID must be exactly 12 digits').nullable().optional(),
  philhealth_membership: PhilhealthMembershipEnum.nullable().optional(),
  philhealth_category: PhilhealthCategoryEnum.nullable().optional(),
  is_pregnant: z.boolean().default(false),
  lmp_date: z.string().regex(dateRegex).nullable().optional(),
  uses_fp: z.boolean().nullable().optional(),
  fp_method_code: FpMethodCodeEnum.nullable().optional(),
  fp_method_other: z.string().max(100).nullable().optional(),
  fp_status_code: FpStatusCodeEnum.nullable().optional(),
  is_pwd: z.boolean().default(false),
  disability_type_code: DisabilityTypeCodeEnum.nullable().optional(),
  medical_conditions: z.array(medicalConditionSchema).optional().default([]),
})
.refine(
  (data) => data.relation_to_head !== 'OTHER' || (data.relation_other && data.relation_other.trim() !== ''),
  { message: "relation_other is required when relation_to_head is 'OTHER'", path: ['relation_other'] }
)
.refine(
  (data) => data.religion_code !== 'OTH' || (data.religion_other && data.religion_other.trim() !== ''),
  { message: "religion_other is required when religion_code is 'OTH'", path: ['religion_other'] }
)
.refine(
  (data) => !data.is_pregnant || data.sex === 'F',
  { message: 'is_pregnant can only be true for females', path: ['is_pregnant'] }
)
.refine(
  (data) => !data.is_pregnant || (data.lmp_date && data.lmp_date.trim() !== ''),
  { message: 'lmp_date is required when is_pregnant is true', path: ['lmp_date'] }
)
.refine(
  (data) => data.sex === 'F' || (data.uses_fp == null && !data.fp_method_code && !data.fp_status_code),
  { message: 'Family planning fields are only allowed for females', path: ['uses_fp'] }
)
.refine(
  (data) => !data.uses_fp || data.fp_method_code != null,
  { message: 'fp_method_code is required when uses_fp is true', path: ['fp_method_code'] }
)
.refine(
  (data) => data.fp_method_code !== 'OTH' || (data.fp_method_other && data.fp_method_other.trim() !== ''),
  { message: "fp_method_other is required when fp_method_code is 'OTH'", path: ['fp_method_other'] }
)
.refine(
  (data) => data.philhealth_category == null || data.philhealth_membership === 'MEMBER',
  { message: "philhealth_category is allowed only when philhealth_membership is 'MEMBER'", path: ['philhealth_category'] }
)
.refine(
  (data) => data.is_pwd || data.disability_type_code == null,
  { message: 'disability_type_code is allowed only when is_pwd is true', path: ['disability_type_code'] }
);

export const residentUpdateSchema = z.object({
  last_name: z.string().min(1).max(100).optional(),
  first_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).nullable().optional(),
  relation_to_head: RelationToHeadEnum.optional(),
  relation_other: z.string().max(100).nullable().optional(),
  birth_date: z.string().regex(dateRegex, 'Birth date must be YYYY-MM-DD').refine(
    (d) => {
      const birth = new Date(d);
      const minDate = new Date('1900-01-01');
      const now = new Date();
      return birth >= minDate && birth <= now;
    },
    { message: 'Birth date must be between 1900-01-01 and today' }
  ).optional(),
  sex: SexEnum.optional(),
  civil_status_code: CivilStatusCodeEnum.optional(),
  education_code: EducationCodeEnum.optional(),
  religion_code: ReligionCodeEnum.nullable().optional(),
  religion_other: z.string().max(100).nullable().optional(),
  ethnic_group: EthnicGroupEnum.nullable().optional(),
  occupation: z.string().max(100).nullable().optional(),
  philhealth_id: z.string().regex(/^[0-9]{12}$/, 'PhilHealth ID must be exactly 12 digits').nullable().optional(),
  philhealth_membership: PhilhealthMembershipEnum.nullable().optional(),
  philhealth_category: PhilhealthCategoryEnum.nullable().optional(),
  is_pregnant: z.boolean().optional(),
  lmp_date: z.string().regex(dateRegex).nullable().optional(),
  uses_fp: z.boolean().nullable().optional(),
  fp_method_code: FpMethodCodeEnum.nullable().optional(),
  fp_method_other: z.string().max(100).nullable().optional(),
  fp_status_code: FpStatusCodeEnum.nullable().optional(),
  is_pwd: z.boolean().optional(),
  disability_type_code: DisabilityTypeCodeEnum.nullable().optional(),
  medical_conditions: z.array(medicalConditionSchema).optional(),
})
.refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)
.refine(
  (data) => data.relation_to_head !== 'OTHER' || (data.relation_other && data.relation_other.trim() !== ''),
  { message: "relation_other is required when relation_to_head is 'OTHER'", path: ['relation_other'] }
)
.refine(
  (data) => data.religion_code !== 'OTH' || (data.religion_other && data.religion_other.trim() !== ''),
  { message: "religion_other is required when religion_code is 'OTH'", path: ['religion_other'] }
)
.refine(
  (data) => data.is_pregnant === undefined || !data.is_pregnant || data.sex === undefined || data.sex === 'F',
  { message: 'is_pregnant can only be true for females', path: ['is_pregnant'] }
)
.refine(
  (data) => !data.is_pregnant || (data.lmp_date && data.lmp_date.trim() !== ''),
  { message: 'lmp_date is required when is_pregnant is true', path: ['lmp_date'] }
)
.refine(
  (data) => data.fp_method_code !== 'OTH' || (data.fp_method_other && data.fp_method_other.trim() !== ''),
  { message: "fp_method_other is required when fp_method_code is 'OTH'", path: ['fp_method_other'] }
);

export const residentSearchQuerySchema = z.object({
  q: z.string().min(2).max(100).optional(),
  zone_id: z.coerce.number().int().positive().optional(),
  household_id: z.coerce.number().int().positive().optional(),
  age_risk_group: z.enum(['N', 'I', 'PSAC', 'SAC', 'AD', 'A', 'SC']).optional(),
  include_inactive: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});
