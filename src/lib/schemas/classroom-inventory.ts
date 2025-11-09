// src/lib/schemas/classroom-inventory.ts
import { z } from 'zod';

// Schema for a single editable item in the form
export const EditableInventoryItemSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name cannot be empty."),
  quantityStart: z.string(), // Kept as string for controlled input
  quantityAdded: z.string(),
  quantityLost: z.string(),
  remarks: z.string().optional(),
});

// Schema for a single item when stored in Firestore (quantities are numbers)
export const InventoryItemSchema = z.object({
  id: z.string(),
  itemName: z.string(),
  quantityStart: z.number(),
  quantityAdded: z.number(),
  quantityLost: z.number(),
  remarks: z.string().optional(),
});

// Schema for the entire classroom inventory document
export const ClassroomInventorySchema = z.object({
  yearLevel: z.string(),
  term: z.string(),
  items: z.array(InventoryItemSchema),
  lastUpdatedBy: z.string(),
  updatedAt: z.string().datetime().or(z.date()),
});

export type EditableInventoryItem = z.infer<typeof EditableInventoryItemSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type ClassroomInventory = z.infer<typeof ClassroomInventorySchema>;
