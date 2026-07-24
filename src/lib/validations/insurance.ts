import { z } from "zod";

const optionalPhone = z
  .string()
  .max(20)
  .regex(/^[+()\-.\s0-9]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const insuranceCompanySchema = z.object({
  name: z.string().min(1, "Payer name is required").max(160),
  payerIdCode: z.string().max(40).optional().or(z.literal("")),
  phone: optionalPhone,
  fax: optionalPhone,
  website: z
    .string()
    .max(255)
    .regex(/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i, "Enter a valid website")
    .optional()
    .or(z.literal("")),
  claimsAddressLine1: z.string().max(255).optional().or(z.literal("")),
  claimsAddressLine2: z.string().max(255).optional().or(z.literal("")),
  claimsCity: z.string().max(120).optional().or(z.literal("")),
  claimsState: z.string().max(2).optional().or(z.literal("")),
  claimsPostalCode: z.string().max(10).optional().or(z.literal("")),
  benefitsNotes: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type InsuranceCompanyInput = z.infer<typeof insuranceCompanySchema>;

export const insuranceCompanySearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
});
export type InsuranceCompanySearchInput = z.infer<typeof insuranceCompanySearchSchema>;
