import { z } from "zod";

export const GenerateReferralCodeSchema = z.object({
  customerId: z.string().min(1),
});

export const ValidateReferralCodeSchema = z.object({
  code: z.string().min(1, "Referral code is required"),
});

export const RedeemReferralSchema = z.object({
  referralId: z.string().min(1),
  referredCustomerId: z.string().min(1),
  orderId: z.string().min(1),
});
