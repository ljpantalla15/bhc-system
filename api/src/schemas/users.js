import { z } from 'zod';

export const userRoleEnum = z.enum(['BHW', 'MIDWIFE', 'ADMIN']);

export const listUsersQuerySchema = z.object({
  role: userRoleEnum.optional(),
  include_inactive: z
    .preprocess((val) => {
      if (val === undefined || val === '') return true;
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return val;
    }, z.boolean())
    .default(true),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export const userCreateSchema = z
  .object({
    username: z
      .string()
      .regex(/^[a-z0-9._-]{3,50}$/, {
        message: 'Username must be 3-50 characters containing only lowercase letters, digits, dots, underscores, or hyphens',
      }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(200),
    full_name: z
      .string()
      .trim()
      .min(1, { message: 'Full name is required' })
      .max(150),
    role: userRoleEnum,
    zone_ids: z
      .array(z.number().int().positive())
      .refine((items) => new Set(items).size === items.length, {
        message: 'zone_ids must contain unique values',
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.role !== 'BHW' && data.zone_ids && data.zone_ids.length > 0) {
        return false;
      }
      return true;
    },
    {
      message: 'zone_ids is allowed only for BHW accounts',
      path: ['zone_ids'],
    }
  );

export const userUpdateSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, { message: 'Full name cannot be empty' })
      .max(150)
      .optional(),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .max(200)
      .optional(),
    role: userRoleEnum.optional(),
    is_active: z.boolean().optional(),
    zone_ids: z
      .array(z.number().int().positive())
      .refine((items) => new Set(items).size === items.length, {
        message: 'zone_ids must contain unique values',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.role && data.role !== 'BHW' && data.zone_ids && data.zone_ids.length > 0) {
        return false;
      }
      return true;
    },
    {
      message: 'zone_ids is allowed only for BHW accounts',
      path: ['zone_ids'],
    }
  );
