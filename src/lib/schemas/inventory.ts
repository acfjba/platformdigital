// src/lib/schemas/inventory.ts
import { z } from 'zod';

export const InventoryItemSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  itemName: z.string().min(1, "Item name is required."),
  category: z.string().min(1, "Category is required."),
  quantity: z.number().int().min(0, "Quantity must be a non-negative number."),
  value: z.number().min(0, "Value must be a non-negative number."),
  status: z.enum(["In Stock", "Low Stock", "Out of Stock"]),
  location: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const InventoryItemFormDataSchema = InventoryItemSchema.omit({
    id: true,
    schoolId: true,
    status: true, // Status is calculated, not set by form
    createdAt: true,
    updatedAt: true,
}).extend({
    // In the form, quantity and value can be strings, so we parse them.
    quantity: z.preprocess(
        (a) => parseInt(z.string().parse(a), 10),
        z.number().int().min(0)
    ),
    value: z.preprocess(
        (a) => parseFloat(z.string().parse(a)),
        z.number().min(0)
    ),
});


export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type InventoryItemFormData = z.infer<typeof InventoryItemFormDataSchema>;
