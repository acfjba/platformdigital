// src/lib/schemas/ohs.ts
import { z } from 'zod';

const incidentTypes = z.enum(["Injury", "Near Miss", "Hazard", "Property Damage", "Other"]);

export const OhsRecordSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  incidentType: incidentTypes,
  location: z.string().min(1, "Location is required."),
  incidentDate: z.string().min(1, "Incident date is required."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  actionTaken: z.string().min(1, "Action taken is required."),
  reportedBy: z.string().min(1, "Reporter's name is required."),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const OhsRecordFormDataSchema = OhsRecordSchema.omit({
    id: true,
    schoolId: true,
    createdAt: true,
    updatedAt: true,
});

export type OhsRecord = z.infer<typeof OhsRecordSchema>;
export type OhsRecordFormData = z.infer<typeof OhsRecordFormDataSchema>;
    