// src/lib/schemas/maintenance.ts
import { z } from 'zod';

export const MaintenanceSettingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  title: z.string().optional(),
  message: z.string().optional(),
});

export type MaintenanceSettings = z.infer<typeof MaintenanceSettingsSchema>;
