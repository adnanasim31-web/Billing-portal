import { z } from "zod";

export const AGING_BUCKETS = ["0_30", "31_60", "61_90", "91_120", "over_120"] as const;

export const arNoteSchema = z.object({
  body: z.string().min(1, "Note is required").max(2000),
});
export type ArNoteInput = z.infer<typeof arNoteSchema>;

export const arSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  agingBucket: z.enum([...AGING_BUCKETS, "all"]).default("all"),
});
export type ArSearchInput = z.infer<typeof arSearchSchema>;
