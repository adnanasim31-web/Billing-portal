import { describe, expect, it } from "vitest";
import { appointmentSchema, appointmentStatusSchema } from "@/lib/validations/appointments";

describe("appointmentSchema", () => {
  const base = {
    patientId: "11111111-1111-1111-1111-111111111111",
    providerId: "22222222-2222-2222-2222-222222222222",
    appointmentType: "follow_up" as const,
    date: "2026-01-15",
    startTime: "09:00",
    endTime: "09:30",
  };

  it("accepts a valid appointment", () => {
    expect(appointmentSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = appointmentSchema.safeParse({ ...base, startTime: "10:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects an equal start/end time", () => {
    const result = appointmentSchema.safeParse({ ...base, startTime: "09:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid patientId", () => {
    const result = appointmentSchema.safeParse({ ...base, patientId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = appointmentSchema.safeParse({ ...base, date: "01/15/2026" });
    expect(result.success).toBe(false);
  });
});

describe("appointmentStatusSchema", () => {
  it("requires a cancellation reason when cancelling", () => {
    const result = appointmentStatusSchema.safeParse({ status: "cancelled" });
    expect(result.success).toBe(false);
  });

  it("accepts a cancellation with a reason", () => {
    const result = appointmentStatusSchema.safeParse({
      status: "cancelled",
      cancellationReason: "Patient rescheduled",
    });
    expect(result.success).toBe(true);
  });

  it("does not require a reason for non-cancellation statuses", () => {
    expect(appointmentStatusSchema.safeParse({ status: "checked_in" }).success).toBe(true);
    expect(appointmentStatusSchema.safeParse({ status: "completed" }).success).toBe(true);
  });
});
