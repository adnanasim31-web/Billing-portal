import { z } from "zod";

const dateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const timeString = z
  .string()
  .min(1, "Time is required")
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use 24-hour HH:MM format");

export const appointmentSchema = z
  .object({
    patientId: z.string().uuid("Select a patient"),
    providerId: z.string().uuid("Select a provider"),
    appointmentType: z.enum(["new_patient", "follow_up", "procedure", "telehealth", "other"]).default("follow_up"),
    date: dateString,
    startTime: timeString,
    endTime: timeString,
    reason: z.string().max(500).optional().or(z.literal("")),
    location: z.string().max(160).optional().or(z.literal("")),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const appointmentStatusSchema = z
  .object({
    status: z.enum(["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
    cancellationReason: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.status !== "cancelled" || !!data.cancellationReason, {
    message: "A cancellation reason is required",
    path: ["cancellationReason"],
  });
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;

export const appointmentSearchSchema = z.object({
  date: dateString.optional(),
  providerId: z.string().uuid().optional().or(z.literal("")),
  status: z
    .enum(["scheduled", "checked_in", "in_progress", "completed", "cancelled", "no_show", "all"])
    .default("all"),
});
export type AppointmentSearchInput = z.infer<typeof appointmentSearchSchema>;
