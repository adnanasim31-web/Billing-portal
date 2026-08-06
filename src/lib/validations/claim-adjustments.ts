import { z } from "zod";

export const CLAIM_ADJUSTMENT_CATEGORIES = [
  "write_off",
  "contractual",
  "financial_hardship",
  "courtesy",
  "correction",
  "other",
] as const;

export const claimAdjustmentSchema = z.object({
  claimLineId: z.string().uuid(),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.enum(CLAIM_ADJUSTMENT_CATEGORIES),
  notes: z.string().max(500).optional().or(z.literal("")),
});
export type ClaimAdjustmentInput = z.infer<typeof claimAdjustmentSchema>;
