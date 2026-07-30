import { z } from "zod";

const dateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const PAYMENT_METHODS = ["era", "check", "credit_card", "cash", "eft", "other"] as const;

export const paymentSchema = z.object({
  claimId: z.string().uuid("Select a claim"),
  payerName: z.string().min(1, "Payer name is required").max(200),
  paymentMethod: z.enum(PAYMENT_METHODS).default("era"),
  paymentDate: dateString,
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  totalAmount: z.number().positive("Total amount must be greater than zero").max(9_999_999),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const paymentAllocationSchema = z.object({
  claimLineId: z.string().uuid("Select a procedure line"),
  paidAmount: z.number().min(0).max(9_999_999),
  adjustmentAmount: z.number().min(0).max(9_999_999),
  adjustmentReason: z.string().max(300).optional().or(z.literal("")),
});
export type PaymentAllocationInput = z.infer<typeof paymentAllocationSchema>;

export const paymentSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  method: z.enum([...PAYMENT_METHODS, "all"]).default("all"),
});
export type PaymentSearchInput = z.infer<typeof paymentSearchSchema>;
