import { z } from 'zod';

export const MasterlistCategoryEnum = z.enum(
  ['SENIOR_CITIZEN', 'UNDER_FIVE', 'PREGNANT', 'PWD'],
  {
    required_error: 'Masterlist category is required',
    invalid_type_error: "Category must be one of 'SENIOR_CITIZEN', 'UNDER_FIVE', 'PREGNANT', 'PWD'",
  }
);

export const masterlistQuerySchema = z.object({
  category: MasterlistCategoryEnum,
  zone_id: z.coerce.number().int().positive().optional(),
});
