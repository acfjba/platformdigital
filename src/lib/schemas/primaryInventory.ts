// src/lib/schemas/primaryInventory.ts
import { z } from 'zod';

export const PrimaryInventoryItemSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name is required."),
  quantity: z.number().int().nonnegative("Quantity must be a non-negative number."),
  value: z.number().nonnegative("Value must be a non-negative number."),
  remarks: z.string().optional(),
  lastUpdatedBy: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export type PrimaryInventory = z.infer<typeof PrimaryInventoryItemSchema>;

export const EditablePrimaryInventoryItemSchema = PrimaryInventoryItemSchema.pick({
    id: true,
    itemName: true,
    remarks: true,
}).extend({
    quantity: z.string(),
    value: z.string(),
});

export type EditablePrimaryInventoryItem = z.infer<typeof EditablePrimaryInventoryItemSchema>;
