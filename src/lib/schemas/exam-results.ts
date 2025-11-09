// src/lib/schemas/exam-results.ts
import { z } from 'zod';

export const examTypes = [
    "Mid-Term",
    "Final Exam",
    "Quiz",
    "Standardized Test",
    "Term 1 Assessment",
    "Term 2 Assessment",
    "Term 3 Assessment",
    "Term 4 Assessment",
    "Other"
] as const;

export const ExamResultSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  studentId: z.string().min(1, "Student ID is required."),
  studentName: z.string().min(1, "Student name is required."),
  studentYear: z.string().min(1, "Student year is required."),
  examType: z.enum(examTypes, { required_error: "Exam type is required." }),
  otherExamTypeName: z.string().optional(),
  subject: z.string().min(1, "Subject is required."),
  score: z.number().optional(),
  grade: z.string().optional(),
  examDate: z.string().min(1, 'Exam date is required.'),
  term: z.string().min(1, "Term is required."),
  year: z.string().min(4, "Academic year is required."),
  comments: z.string().optional(),
  recordedByUserId: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const ExamResultFormInputSchema = ExamResultSchema.omit({
    id: true,
    schoolId: true,
    recordedByUserId: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    score: z.preprocess(
        (val) => (val === "" || val === null || val === undefined) ? undefined : parseFloat(String(val)),
        z.number({ invalid_type_error: "Score must be a number" }).optional()
    )
}).refine(data => {
    if (data.examType === 'Other' && !data.otherExamTypeName) {
        return false;
    }
    return true;
}, {
    message: "Please specify the 'Other' exam type name.",
    path: ["otherExamTypeName"],
});

export type ExamResult = z.infer<typeof ExamResultSchema>;
export type ExamResultFormData = z.infer<typeof ExamResultFormInputSchema>;
