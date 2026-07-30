import { z } from "zod";

export const DOCUMENT_CATEGORIES = [
  "contract",
  "policy",
  "payer_agreement",
  "compliance",
  "provider_credential",
  "other",
] as const;

export const DOCUMENT_ENTITY_TYPES = ["patient", "provider", "claim"] as const;

export const documentMetaSchema = z.object({
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  category: z.enum(DOCUMENT_CATEGORIES).default("other"),
  entityType: z.enum(DOCUMENT_ENTITY_TYPES).optional().or(z.literal("")),
  entityId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

export const documentSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  category: z.enum([...DOCUMENT_CATEGORIES, "all"]).default("all"),
});
export type DocumentSearchInput = z.infer<typeof documentSearchSchema>;
