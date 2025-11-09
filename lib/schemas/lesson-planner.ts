// src/lib/schemas/lesson-planner.ts
import { z } from 'zod';

export const LessonPlanSchema = z.object({
  yearLevel: z.string().min(1, "Year Level is required."),
  subject: z.string().min(1, "Subject is required."),
  topic: z.string().min(1, "Topic is required."),
  term: z.string().min(1, "Term is required."),
  week: z.string().min(1, "Week is required."),
  objectives: z.string().min(1, "Learning objectives are required."),
  activities: z.string().min(1, "Learning activities are required."),
  resources: z.string().min(1, "Resources are required."),
  assessment: z.string().min(1, "Assessment methods are required."),
  schoolId: z.string().optional(),
  teacherId: z.string().optional(),
});

export const FullLessonPlanSchema = LessonPlanSchema.extend({
    id: z.string(),
    createdAt: z.string().datetime().or(z.date()),
    updatedAt: z.string().datetime().or(z.date()),
});

export type LessonPlanFormData = z.infer<typeof LessonPlanSchema>;
export type LessonPlan = z.infer<typeof FullLessonPlanSchema>;
