// src/lib/schemas/subjects.ts
import { z } from 'zod';

export const SubjectSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  name: z.string().min(1, "Subject name is required."),
  yearLevel: z.string().min(1, "Year level is required."),
  description: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const SubjectFormDataSchema = SubjectSchema.pick({
    name: true,
    yearLevel: true,
    description: true,
});

export type Subject = z.infer<typeof SubjectSchema>;
export type SubjectFormData = z.infer<typeof SubjectFormDataSchema>;
