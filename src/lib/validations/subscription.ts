import { z } from "zod";

export const changePlanSchema = z.object({
  planTier: z.enum(["starter", "professional", "enterprise"]),
  billingCycle: z.enum(["monthly", "annual"]),
});
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
