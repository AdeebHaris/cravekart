import { z } from 'zod';

export const signupSchema = z.object({
    username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, "Username must be max 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscore'),

    email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email format' }),

    password: z.string()
    .trim()
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'password must be max 20 characters'),


    first_name: z.string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(30, 'First name must be max 30 characters'),

    last_name:z.string()
    .trim()
    .min(1, 'Last name must be min 1 characters')
    .max(30, 'Last name must be max 30 characters')
}).refine(
    (data) => /[A-Z]/.test(data.password) && /[0-9]/.test(data.password) && /[!@#$%^&*(),.?":{}|<>]/.test(data.password),
    { 
        message: 'Password must contain at least one uppercase letter, one number, and one special character',
        path: ['password']
    }
)


export const loginSchema = z.object({
    username: z.string().trim()
    .min(1, 'Username is required'),
    password: z.string().trim()
    .min(1,'Password is required')
});

export const googleLoginSchema = z.object({
    googleToken: z.string().trim().min(1, 'Google token is required')
})

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;