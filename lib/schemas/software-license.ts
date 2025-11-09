// src/lib/schemas/software-license.ts
import { z } from 'zod';

export const licenseStatuses = ['Active', 'Expired', 'Cancelled'] as const;
export const userLimitTypes = ['Single User', 'Multi-User (5)', 'Site License (Unlimited)'] as const;

export const SoftwareLicenseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Software name is required.'),
  licenseKey: z.string(),
  schoolId: z.string().min(1, "A school must be selected."),
  schoolName: z.string(),
  startDate: z.string().min(1, 'Start date is required.'),
  expiryDate: z.string().min(1, 'Expiry date is required.'),
  userLimit: z.enum(userLimitTypes),
  cost: z.number().min(0, 'Cost must be a non-negative number.'),
  autoRenew: z.boolean().default(false),
  status: z.enum(licenseStatuses),
  notes: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const SoftwareLicenseFormDataSchema = SoftwareLicenseSchema.pick({
    name: true,
    schoolId: true,
    startDate: true,
    expiryDate: true,
    userLimit: true,
    cost: true,
    autoRenew: true,
    notes: true,
});

export type SoftwareLicense = z.infer<typeof SoftwareLicenseSchema>;
export type SoftwareLicenseFormData = z.infer<typeof SoftwareLicenseFormDataSchema>;
