
// src/lib/schemas/staff.ts
import { z } from 'zod';
import { userRoles } from './user';

export const StaffMemberSchema = z.object({
  id: z.string(),
  staffId: z.string().min(1, "Staff ID is required."),
  tpfNumber: z.string().optional(),
  name: z.string().min(1, "Name is required."),
  role: z.enum(userRoles, { required_error: "A valid role is required." }),
  yearLevel: z.string().optional(), // Added field for teacher's year level
  position: z.string().min(1, "Position is required."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Active", "On-Leave", "Inactive"]),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(1, "Phone number is required."),
  schoolId: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const StaffMemberFormDataSchema = StaffMemberSchema.omit({
    id: true,
    createdAt: true, 
    updatedAt: true 
}).extend({
    schoolId: z.string().optional(), // schoolId is optional in the form
});


export type StaffMember = z.infer<typeof StaffMemberSchema>;
export type StaffMemberFormData = z.infer<typeof StaffMemberFormDataSchema>;
