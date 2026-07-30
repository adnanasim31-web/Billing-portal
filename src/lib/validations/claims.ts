import { z } from "zod";
import { isValidCodeFormat } from "@/lib/validations/coding";

const dateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const CLAIM_STATUSES = [
  "draft",
  "ready",
  "submitted",
  "accepted",
  "rejected",
  "denied",
  "paid",
  "appealed",
  "closed",
] as const;

/** Claim shell: created up front, then diagnoses/lines are attached on the detail page. */
export const claimSchema = z
  .object({
    patientId: z.string().uuid("Select a patient"),
    providerId: z.string().uuid("Select a provider"),
    payerCompanyId: z.string().uuid().optional().or(z.literal("")),
    patientInsurancePolicyId: z.string().uuid().optional().or(z.literal("")),
    serviceDateFrom: dateString,
    serviceDateTo: dateString,
    placeOfService: z.string().max(10).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((data) => data.serviceDateTo >= data.serviceDateFrom, {
    message: "End of service date must be on or after the start",
    path: ["serviceDateTo"],
  });
export type ClaimInput = z.infer<typeof claimSchema>;

export const claimDiagnosisSchema = z.object({
  sequence: z.number().int().min(1).max(12),
  icd10Code: z
    .string()
    .min(1, "ICD-10 code is required")
    .max(20)
    .refine((code) => isValidCodeFormat("icd10", code), "Not a valid ICD-10 code format"),
});
export type ClaimDiagnosisInput = z.infer<typeof claimDiagnosisSchema>;

export const claimLineSchema = z.object({
  lineNumber: z.number().int().min(1).max(50),
  procedureCode: z
    .string()
    .min(1, "Procedure code is required")
    .max(20)
    .refine(
      (code) => isValidCodeFormat("cpt", code) || isValidCodeFormat("hcpcs", code),
      "Not a valid CPT/HCPCS code format"
    ),
  modifier1: z
    .string()
    .max(10)
    .optional()
    .or(z.literal(""))
    .refine((code) => !code || isValidCodeFormat("modifier", code), "Not a valid modifier format"),
  modifier2: z
    .string()
    .max(10)
    .optional()
    .or(z.literal(""))
    .refine((code) => !code || isValidCodeFormat("modifier", code), "Not a valid modifier format"),
  diagnosisPointers: z.array(z.number().int().min(1).max(12)).min(1, "Link at least one diagnosis"),
  units: z.number().int().min(1).max(999).default(1),
  chargeAmount: z.number().min(0).max(9_999_999),
});
export type ClaimLineInput = z.infer<typeof claimLineSchema>;

export const claimStatusChangeSchema = z
  .object({
    status: z.enum(CLAIM_STATUSES),
    note: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine((data) => data.status !== "rejected" || !!data.note, {
    message: "A rejection reason is required",
    path: ["note"],
  })
  .refine((data) => data.status !== "denied" || !!data.note, {
    message: "A denial reason is required",
    path: ["note"],
  });
export type ClaimStatusChangeInput = z.infer<typeof claimStatusChangeSchema>;

export const claimSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum([...CLAIM_STATUSES, "all"]).default("all"),
  providerId: z.string().uuid().optional().or(z.literal("")),
});
export type ClaimSearchInput = z.infer<typeof claimSearchSchema>;
