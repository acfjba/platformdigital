// src/lib/schemas/school.ts
import { z } from 'zod';

export const ModulePermissionsSchema = z.object({
    // Dashboards
    teacherDashboard: z.boolean().default(true),
    headTeacherDashboard: z.boolean().default(true),
    primaryAdminDashboard: z.boolean().default(true),
    // Modules
    academics: z.boolean().default(true),
    lessonPlanner: z.boolean().default(true),
    examResults: z.boolean().default(true),
    studentServices: z.boolean().default(true),
    operations: z.boolean().default(true),
});

export type ModulePermissions = z.infer<typeof ModulePermissionsSchema>;

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  type: z.string(),
  history: z.string().optional(),
  enabledModules: ModulePermissionsSchema.optional(),
});

export const SchoolWithUserCountSchema = SchoolSchema.extend({
    userCount: z.number(),
    teacherCount: z.number(),
});

export type School = z.infer<typeof SchoolSchema>;
export type SchoolWithUserCount = z.infer<typeof SchoolWithUserCountSchema>;
