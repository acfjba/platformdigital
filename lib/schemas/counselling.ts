// src/lib/schemas/counselling.ts
import { z } from 'zod';

export const counsellingTypes = [
  'Academic',
  'Behavioral',
  'Family Issues',
  'Peer Relationship',
  'Personal',
  'Crisis Intervention',
  'Other',
] as const;

export const CounsellingRecordSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(), // ID of the counsellor/staff member who created the record
  sessionDate: z.string().min(1, 'Session date is required.'),
  studentName: z.string().min(1, 'Student name is required.'),
  studentId: z.string().min(1, 'Student ID is required.'),
  studentDob: z.string().min(1, 'Student Date of Birth is required.'),
  studentYear: z.string().min(1, 'Student year level is required.'),
  counsellingType: z.enum(counsellingTypes, { required_error: "Counselling type is required." }),
  otherCounsellingType: z.string().optional(),
  sessionDetails: z.string().min(1, 'Session details are required.'),
  actionPlan: z.string().min(1, 'Action plan or next steps are required.'),
  parentsContacted: z.enum(['Yes', 'No', 'Attempted', 'Not Required']).optional(),
  counsellorName: z.string().min(1, "Counsellor's name is required."),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const CounsellingRecordFormInputSchema = CounsellingRecordSchema.omit({
    id: true,
    schoolId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
}).refine(data => {
    if (data.counsellingType === 'Other' && !data.otherCounsellingType) {
        return false;
    }
    return true;
}, {
    message: "Please specify the 'Other' counselling type.",
    path: ["otherCounsellingType"],
});

export type CounsellingRecord = z.infer<typeof CounsellingRecordSchema>;
export type CounsellingRecordFormData = z.infer<typeof CounsellingRecordFormInputSchema>;