// src/lib/schemas/library.ts
import { z } from 'zod';

export const BookSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required."),
  author: z.string().min(1, "Author is required."),
  isbn: z.string().optional(),
  value: z.number().optional(), // Added for reporting
  totalCopies: z.number().int().min(1, "Total copies must be at least 1."),
  availableCopies: z.number().int().min(0),
  schoolId: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const BookFormSchema = BookSchema.pick({
    title: true,
    author: true,
    isbn: true,
    totalCopies: true,
    value: true,
}).extend({
    totalCopies: z.preprocess(
        (val) => parseInt(z.string().parse(val), 10),
        z.number().int().min(1, "Total copies must be at least 1.")
    ),
    value: z.preprocess(
        (val) => val ? parseFloat(z.string().parse(val)) : undefined,
        z.number().min(0).optional()
    ),
});

export const LibraryTransactionSchema = z.object({
    id: z.string(),
    bookId: z.string(),
    bookTitle: z.string(),
    studentId: z.string().min(1, "Student ID is required."),
    studentName: z.string().min(1, "Student name is required."),
    issuedBy: z.string(),
    issuedAt: z.string().datetime().or(z.date()),
    dueDate: z.string().min(1, "Due date is required."),
    status: z.enum(['issued']),
    schoolId: z.string(),
    createdAt: z.string().datetime().or(z.date()),
    updatedAt: z.string().datetime().or(z.date()),
});

export const LibraryTransactionFormSchema = LibraryTransactionSchema.pick({
    bookId: true,
    studentId: true,
    studentName: true,
    dueDate: true,
});

export type Book = z.infer<typeof BookSchema>;
export type BookFormData = z.infer<typeof BookFormSchema>;
export type LibraryTransaction = z.infer<typeof LibraryTransactionSchema>;
export type LibraryTransactionFormData = z.infer<typeof LibraryTransactionFormSchema>;
