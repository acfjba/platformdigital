// src/lib/schemas/attendance.ts
import { z } from 'zod';

export const attendanceStatuses = ['Present', 'On Leave', 'Paid Leave', 'Sick', 'Unpaid Leave', 'Absent without Leave'] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const StaffAttendanceRecordSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  staffId: z.string(),
  staffName: z.string(),
  date: z.string().min(1, 'Date is required.'),
  status: z.enum(attendanceStatuses),
  notes: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  recordedBy: z.string(), // User ID
  createdAt: z.union([z.string().datetime(), z.date(), z.any()]),
  updatedAt: z.union([z.string().datetime(), z.date(), z.any()]),
});

export const StaffAttendanceFormDataSchema = StaffAttendanceRecordSchema.pick({
  staffId: true,
  date: true,
  status: true,
  notes: true,
  checkIn: true,
  checkOut: true,
});


export type StaffAttendanceRecord = z.infer<typeof StaffAttendanceRecordSchema>;
export type StaffAttendanceFormData = z.infer<typeof StaffAttendanceFormDataSchema>;
