// src/lib/schemas/disciplinary.ts
import { z } from 'zod';

export const issueTypes = [
  'Bullying',
  'Vandalism',
  'Absenteeism',
  'Lateness',
  'Disrespect',
  'Violence',
  'Drug',
  'Theft',
  'Cheating',
  'Other',
] as const;

export const DisciplinaryRecordSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  userId: z.string(),
  incidentDate: z.string().min(1, 'Incident date is required.'),
  studentName: z.string().min(1, 'Student name is required.'),
  studentId: z.string().min(1, 'Student ID is required.'),
  studentDob: z.string().min(1, 'Student Date of Birth is required.'),
  studentYear: z.string().min(1, 'Student year level is required.'),
  issues: z.array(z.enum(issueTypes)).nonempty('At least one issue must be selected.'),
  drugType: z.string().optional(),
  otherIssue: z.string().optional(),
  comments: z.string().min(1, 'Incident details/comments are required.'),
  raisedBy: z.string().min(1, 'Please specify who raised the issue.'),
  parentsInformed: z.enum(['Yes', 'No', 'Attempted']).optional(),
  actionComments: z.string().min(1, 'Please describe the action taken.'),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const DisciplinaryRecordFormDataSchema = DisciplinaryRecordSchema.omit({
    id: true,
    schoolId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
}).refine(data => {
    if (data.issues.includes('Drug') && !data.drugType) {
        return false;
    }
    return true;
}, {
    message: "Please specify the type of drug.",
    path: ["drugType"],
}).refine(data => {
    if (data.issues.includes('Other') && !data.otherIssue) {
        return false;
    }
    return true;
}, {
    message: "Please describe the 'Other' issue.",
    path: ["otherIssue"],
});


export type DisciplinaryRecord = z.infer<typeof DisciplinaryRecordSchema>;
export type DisciplinaryRecordFormData = z.infer<typeof DisciplinaryRecordFormDataSchema>;
