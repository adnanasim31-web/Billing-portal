import { z } from "zod";

const dateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const optionalPhone = z
  .string()
  .max(20)
  .regex(/^[+()\-.\s0-9]*$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  middleName: z.string().max(80).optional().or(z.literal("")),
  preferredName: z.string().max(80).optional().or(z.literal("")),
  dateOfBirth: dateString.refine((val) => new Date(val).getTime() <= Date.now(), {
    message: "Date of birth cannot be in the future",
  }),
  sex: z.enum(["male", "female", "other", "unspecified"]).default("unspecified"),
  ssnLast4: z
    .string()
    .regex(/^\d{4}$/, "Enter the last 4 digits")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phoneMobile: optionalPhone,
  phoneHome: optionalPhone,
  addressLine1: z.string().max(255).optional().or(z.literal("")),
  addressLine2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional().or(z.literal("")),
  preferredLanguage: z.string().max(40).default("en"),
  status: z.enum(["active", "inactive", "deceased"]).default("active"),
});
export type PatientInput = z.infer<typeof patientSchema>;

export const patientInsuranceSchema = z
  .object({
    rank: z.enum(["primary", "secondary", "tertiary"]),
    payerName: z.string().min(1, "Payer name is required").max(160),
    payerIdCode: z.string().max(40).optional().or(z.literal("")),
    planName: z.string().max(160).optional().or(z.literal("")),
    policyNumber: z.string().min(1, "Policy number is required").max(80),
    groupNumber: z.string().max(80).optional().or(z.literal("")),
    subscriberName: z.string().min(1, "Subscriber name is required").max(160),
    subscriberDob: z.string().optional().or(z.literal("")),
    subscriberRelationship: z.enum(["self", "spouse", "child", "other"]).default("self"),
    effectiveDate: z.string().optional().or(z.literal("")),
    terminationDate: z.string().optional().or(z.literal("")),
    copayAmount: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((v) => (Number.isNaN(v) ? undefined : v)),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => !data.terminationDate || !data.effectiveDate || data.terminationDate >= data.effectiveDate,
    { message: "Termination date must be after the effective date", path: ["terminationDate"] }
  );
export type PatientInsuranceInput = z.infer<typeof patientInsuranceSchema>;

export const patientDocumentMetaSchema = z.object({
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1),
  fileSize: z.number().int().positive().max(26_214_400, "File must be 25MB or smaller"),
  mimeType: z.string().min(1).max(120),
  category: z.enum([
    "insurance_card",
    "identification",
    "consent_form",
    "medical_record",
    "referral",
    "other",
  ]),
});
export type PatientDocumentMetaInput = z.infer<typeof patientDocumentMetaSchema>;

export const patientHistoryEntrySchema = z.object({
  entryType: z.enum(["condition", "allergy", "medication", "surgery", "immunization"]),
  description: z.string().min(1, "Description is required").max(500),
  onsetDate: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "resolved", "chronic"]).default("active"),
});
export type PatientHistoryEntryInput = z.infer<typeof patientHistoryEntrySchema>;

export const patientNoteSchema = z.object({
  noteType: z.enum(["general", "billing", "clinical", "collections"]).default("general"),
  body: z.string().min(1, "Note cannot be empty").max(4000),
  isPinned: z.boolean().default(false),
});
export type PatientNoteInput = z.infer<typeof patientNoteSchema>;

export const patientSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "deceased", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});
export type PatientSearchInput = z.infer<typeof patientSearchSchema>;
