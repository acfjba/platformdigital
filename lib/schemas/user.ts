// src/lib/schemas/user.ts
import { z } from 'zod';

export const userRoles = [
  'system-admin',
  'primary-admin',
  'head-teacher',
  'assistant-head-teacher',
  'teacher',
  'kindergarten',
  'librarian',
] as const;

export type Role = (typeof userRoles)[number];

export interface User {
  uid: string;
  email: string;
  role: Role;
  schoolId: string;
  name: string;
}

// Schema for the single user invitation form
export const SingleUserFormSchema = z.object({
    name: z.string().min(1, 'Full name is required.'),
    email: z.string().email('A valid email address is required.'),
    phone: z.string().optional(),
    role: z.string().min(1, "Role is required.") as z.ZodType<Role>,
    schoolId: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long.').optional(),
});

export type UserFormData = z.infer<typeof SingleUserFormSchema>;
