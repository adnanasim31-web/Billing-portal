import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const CREDENTIAL_TYPES = [
  "npi",
  "state_license",
  "dea",
  "malpractice_insurance",
  "board_certification",
  "caqh",
  "w9",
  "other",
] as const;

export const CREDENTIAL_STATUSES = ["active", "expired", "pending_renewal", "revoked"] as const;

export const credentialSchema = z.object({
  credentialType: z.enum(CREDENTIAL_TYPES),
  credentialNumber: z.string().max(100).optional().or(z.literal("")),
  issuingAuthority: z.string().max(200).optional().or(z.literal("")),
  issueDate: dateString.optional().or(z.literal("")),
  expirationDate: dateString.optional().or(z.literal("")),
  status: z.enum(CREDENTIAL_STATUSES).default("active"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type CredentialInput = z.infer<typeof credentialSchema>;

export const credentialSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum([...CREDENTIAL_STATUSES, "all"]).default("all"),
  expiringSoon: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
export type CredentialSearchInput = z.infer<typeof credentialSearchSchema>;
