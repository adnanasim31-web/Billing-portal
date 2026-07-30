import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const REPORT_EXPORT_TYPES = ["status", "collections", "providers", "denials"] as const;

export const reportDateRangeSchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});
export type ReportDateRangeInput = z.infer<typeof reportDateRangeSchema>;

export const reportExportSchema = reportDateRangeSchema.extend({
  type: z.enum(REPORT_EXPORT_TYPES),
});
export type ReportExportInput = z.infer<typeof reportExportSchema>;
