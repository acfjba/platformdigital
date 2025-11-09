// src/lib/schemas/permissions.ts
import { z } from 'zod';

export const PermissionGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Group name is required."),
  users: z.array(z.string()), // Stores an array of user IDs
  permissions: z.array(z.string()), // Stores an array of permission keys
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;
