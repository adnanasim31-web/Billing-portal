import { describe, expect, it } from "vitest";
import { claimAdjustmentSchema } from "@/lib/validations/claim-adjustments";

describe("claimAdjustmentSchema", () => {
  const base = {
    claimLineId: "11111111-1111-1111-1111-111111111111",
    amount: 25.5,
    category: "write_off" as const,
  };

  it("accepts a valid adjustment", () => {
    expect(claimAdjustmentSchema.safeParse(base).success).toBe(true);
  });

  it("accepts optional notes", () => {
    expect(claimAdjustmentSchema.safeParse({ ...base, notes: "Timely filing denial" }).success).toBe(true);
  });

  it("rejects a zero amount", () => {
    expect(claimAdjustmentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(claimAdjustmentSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it("rejects an invalid category", () => {
    expect(claimAdjustmentSchema.safeParse({ ...base, category: "not_a_category" }).success).toBe(false);
  });

  it("rejects a non-uuid claim line id", () => {
    expect(claimAdjustmentSchema.safeParse({ ...base, claimLineId: "not-a-uuid" }).success).toBe(false);
  });
});
