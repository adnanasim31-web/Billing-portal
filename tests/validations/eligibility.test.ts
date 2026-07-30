import { describe, expect, it } from "vitest";
import { eligibilityCheckSchema, eligibilitySearchSchema } from "@/lib/validations/eligibility";

describe("eligibilityCheckSchema", () => {
  it("accepts a valid check with just a patient", () => {
    expect(
      eligibilityCheckSchema.safeParse({ patientId: "11111111-1111-1111-1111-111111111111" }).success
    ).toBe(true);
  });

  it("defaults serviceType to general", () => {
    const result = eligibilityCheckSchema.safeParse({ patientId: "11111111-1111-1111-1111-111111111111" });
    expect(result.success && result.data.serviceType).toBe("general");
  });

  it("rejects a non-uuid patientId", () => {
    expect(eligibilityCheckSchema.safeParse({ patientId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects an invalid service type", () => {
    const result = eligibilityCheckSchema.safeParse({
      patientId: "11111111-1111-1111-1111-111111111111",
      serviceType: "dental",
    });
    expect(result.success).toBe(false);
  });
});

describe("eligibilitySearchSchema", () => {
  it("defaults status to all", () => {
    const result = eligibilitySearchSchema.safeParse({});
    expect(result.success && result.data.status).toBe("all");
  });

  it("accepts a valid status filter", () => {
    expect(eligibilitySearchSchema.safeParse({ status: "active" }).success).toBe(true);
  });

  it("rejects an invalid status filter", () => {
    expect(eligibilitySearchSchema.safeParse({ status: "unknown" }).success).toBe(false);
  });
});
