import { z } from "zod";

export const DENIAL_CATEGORIES = [
  "eligibility",
  "authorization",
  "coding_error",
  "timely_filing",
  "duplicate_claim",
  "medical_necessity",
  "documentation",
  "other",
] as const;

export const DENIAL_RESOLUTION_STATUSES = ["open", "in_progress", "appealed", "resolved", "written_off"] as const;

export const denialUpdateSchema = z
  .object({
    category: z.enum(DENIAL_CATEGORIES),
    assignedTo: z.string().uuid().optional().or(z.literal("")),
    followUpDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
      .optional()
      .or(z.literal("")),
    resolutionStatus: z.enum(DENIAL_RESOLUTION_STATUSES),
    resolutionNotes: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (data) => !["resolved", "written_off"].includes(data.resolutionStatus) || !!data.resolutionNotes,
    { message: "Resolution notes are required when marking resolved or written off", path: ["resolutionNotes"] }
  );
export type DenialUpdateInput = z.infer<typeof denialUpdateSchema>;

export const denialSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  resolutionStatus: z.enum([...DENIAL_RESOLUTION_STATUSES, "all"]).default("all"),
  category: z.enum([...DENIAL_CATEGORIES, "all"]).default("all"),
});
export type DenialSearchInput = z.infer<typeof denialSearchSchema>;
