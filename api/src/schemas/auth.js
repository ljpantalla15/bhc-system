import { z } from 'zod';

export const loginRequestSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(200, 'Password must not exceed 200 characters'),
});

// POST /api/auth/password: a signed-in user changes their own password.
export const changePasswordSchema = z
  .object({
    current_password: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required')
      .max(200, 'Password must not exceed 200 characters'),
    new_password: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters')
      .max(200, 'Password must not exceed 200 characters'),
  })
  .strict()
  .refine((b) => b.new_password !== b.current_password, {
    path: ['new_password'],
    message: 'New password must be different from the current password',
  });
