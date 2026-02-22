import { z } from "zod";

export const SavedFrameSchema = z.object({
  customerId: z.string().min(1),
  inventoryItemId: z.string().optional(),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().optional(),
  color: z.string().optional(),
  sku: z.string().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
  isFavorite: z.boolean().default(false),
  expectedReturnDate: z.string().optional(),
});

export type SavedFrameInput = z.infer<typeof SavedFrameSchema>;
