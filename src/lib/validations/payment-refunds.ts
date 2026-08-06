import { z } from "zod";

export const PAYMENT_REFUND_REASONS = [
  "overpayment",
  "coding_error",
  "patient_dispute",
  "insurance_recoupment",
  "duplicate_payment",
  "other",
] as const;

export const paymentRefundSchema = z.object({
  paymentAllocationId: z.string().uuid(),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.enum(PAYMENT_REFUND_REASONS),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type PaymentRefundInput = z.infer<typeof paymentRefundSchema>;
