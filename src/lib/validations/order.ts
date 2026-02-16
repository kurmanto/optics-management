import { z } from "zod";

export const LineItemSchema = z.object({
  type: z.enum(["FRAME", "LENS", "COATING", "CONTACT_LENS", "EXAM", "ACCESSORY", "DISCOUNT", "OTHER"]),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1).default(1),
  unitPriceCustomer: z.number().min(0),
  unitPriceReal: z.number().min(0),
  inventoryItemId: z.string().optional(),
  notes: z.string().optional(),
});

export const OrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  prescriptionId: z.string().optional().or(z.literal("")),
  insurancePolicyId: z.string().optional().or(z.literal("")),
  type: z.enum(["GLASSES", "CONTACTS", "SUNGLASSES", "ACCESSORIES", "EXAM_ONLY"]).default("GLASSES"),
  status: z.enum(["DRAFT", "CONFIRMED", "LAB_ORDERED", "LAB_RECEIVED", "READY", "PICKED_UP", "CANCELLED"]).default("DRAFT"),
  isDualInvoice: z.boolean().default(false),

  // Frame details (copied from inventory at time of sale)
  frameBrand: z.string().optional().or(z.literal("")),
  frameModel: z.string().optional().or(z.literal("")),
  frameColor: z.string().optional().or(z.literal("")),
  frameSku: z.string().optional().or(z.literal("")),
  frameWholesale: z.number().optional().nullable(),

  lensType: z.string().optional().or(z.literal("")),
  lensCoating: z.string().optional().or(z.literal("")),

  depositCustomer: z.number().min(0).default(0),
  depositReal: z.number().min(0).default(0),

  notes: z.string().optional().or(z.literal("")),
  labNotes: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),

  lineItems: z.array(LineItemSchema).min(1, "At least one item is required"),
});

export type OrderFormValues = z.infer<typeof OrderSchema>;
export type LineItemFormValues = z.infer<typeof LineItemSchema>;
