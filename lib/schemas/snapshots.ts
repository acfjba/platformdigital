// src/lib/schemas/snapshots.ts
import { z } from 'zod';

// Base schema for what a snapshot document contains in Firestore
export const SnapshotSchema = z.object({
  id: z.string(),
  createdAt: z.string(), // ISO string date
  description: z.string(),
  collections: z.record(z.any()).optional(), // Stores collection data as a map, optional in list view
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

// Schema for the API request to restore a snapshot
export const RestoreSnapshotRequestSchema = z.object({
  snapshotId: z.string().min(1, 'Snapshot ID is required.'),
});

export type RestoreSnapshotRequest = z.infer<typeof RestoreSnapshotRequestSchema>;
