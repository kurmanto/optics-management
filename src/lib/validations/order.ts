import { z } from "zod";

export const LineItemSchema = z.object({
  type: z.enum(["FRAME", "LENS", "COATING", "CONTACT_LENS", "EXAM", "ACCESSORY", "OTHER"]),
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
  orderCategory: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "CONFIRMED", "LAB_ORDERED", "LAB_RECEIVED", "VERIFIED", "READY", "PICKED_UP", "CANCELLED"]).default("DRAFT"),
  isDualInvoice: z.boolean().default(false),

  // Frame details (copied from inventory at time of sale)
  frameBrand: z.string().optional().or(z.literal("")),
  frameModel: z.string().optional().or(z.literal("")),
  frameColor: z.string().optional().or(z.literal("")),
  frameSku: z.string().optional().or(z.literal("")),
  frameWholesale: z.number().optional().nullable(),
  frameEyeSize: z.string().optional().or(z.literal("")),
  frameBridge: z.string().optional().or(z.literal("")),
  frameTemple: z.string().optional().or(z.literal("")),
  frameColourCode: z.string().optional().or(z.literal("")),

  lensType: z.string().optional().or(z.literal("")),
  lensCoating: z.string().optional().or(z.literal("")),
  lensDesign: z.string().optional().or(z.literal("")),
  lensAddOns: z.array(z.string()).optional().default([]),

  insuranceCoverage: z.number().min(0).optional().nullable(),
  referralCredit: z.number().min(0).optional().nullable(),

  depositCustomer: z.number().min(0).default(0),
  depositReal: z.number().min(0).default(0),

  notes: z.string().optional().or(z.literal("")),
  labNotes: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),

  lineItems: z.array(LineItemSchema).min(1, "At least one item is required"),
});

export const PickupOptionsSchema = z.object({
  orderId: z.string().min(1),
  sendReviewRequest: z.boolean().default(true),
  enrollInReferralCampaign: z.boolean().default(true),
  markAsLowValue: z.boolean().default(false),
  notes: z.string().optional(),
});

export const ExternalPrescriptionSchema = z.object({
  customerId: z.string().min(1),
  doctorName: z.string().optional(),
  doctorLicense: z.string().optional(),
  rxDate: z.string().optional(),
  notes: z.string().optional(),
  odSphere: z.number().optional(),
  odCylinder: z.number().optional(),
  odAxis: z.number().int().optional(),
  odAdd: z.number().optional(),
  odPd: z.number().optional(),
  osSphere: z.number().optional(),
  osCylinder: z.number().optional(),
  osAxis: z.number().int().optional(),
  osAdd: z.number().optional(),
  osPd: z.number().optional(),
  pdBinocular: z.number().optional(),
  imageUrl: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof OrderSchema>;
export type LineItemFormValues = z.infer<typeof LineItemSchema>;
export type PickupOptionsFormValues = z.infer<typeof PickupOptionsSchema>;
export type ExternalPrescriptionFormValues = z.infer<typeof ExternalPrescriptionSchema>;
