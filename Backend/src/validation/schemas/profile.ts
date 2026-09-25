import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .optional(),

  first_name: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .optional(),
  
  last_name: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .optional(),
  
  email: z
    .string()
    .trim()
    .email({ message: 'Invalid email format' })
    .optional(),
  
  avatar_url: z
    .string()
    .trim()
    .url({ message: 'Invalid URL' })
    .optional(),
  
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone must be 10 digits')
    .optional()
}).refine(
  (data) => Object.values(data).some(v => v !== undefined),
  { message: 'At least one field must be provided' }
);

export const changePasswordSchema = z.object({
  oldPassword: z.string().trim().min(1, 'Old password required'),
  newPassword: z.string().trim().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().trim().min(1, 'Confirm password required')
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
).refine(
  (data) => data.oldPassword !== data.newPassword,
  { message: 'New password must be different from old password', path: ['newPassword'] }
);


export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;