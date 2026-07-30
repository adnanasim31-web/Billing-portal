import { z } from "zod";

export const ELIGIBILITY_SERVICE_TYPES = [
  "general",
  "specialist",
  "behavioral_health",
  "urgent_care",
  "telehealth",
  "other",
] as const;

export const ELIGIBILITY_STATUSES = ["active", "inactive", "error"] as const;

export const eligibilityCheckSchema = z.object({
  patientId: z.string().uuid("Select a patient"),
  patientInsurancePolicyId: z.string().uuid().optional().or(z.literal("")),
  providerId: z.string().uuid().optional().or(z.literal("")),
  serviceType: z.enum(ELIGIBILITY_SERVICE_TYPES).default("general"),
});
export type EligibilityCheckInput = z.infer<typeof eligibilityCheckSchema>;

export const eligibilitySearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum([...ELIGIBILITY_STATUSES, "all"]).default("all"),
});
export type EligibilitySearchInput = z.infer<typeof eligibilitySearchSchema>;
