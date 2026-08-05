import { z } from "zod";
import { emailSchema } from "@/lib/validations/auth";

export const providerPortalLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type ProviderPortalLoginInput = z.infer<typeof providerPortalLoginSchema>;

export const providerPortalDocumentMetaSchema = z.object({
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1),
  fileSize: z.number().int().positive().max(26214400),
  mimeType: z.string().min(1).max(120),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type ProviderPortalDocumentMetaInput = z.infer<typeof providerPortalDocumentMetaSchema>;
