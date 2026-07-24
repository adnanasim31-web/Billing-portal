import { describe, expect, it } from "vitest";
import { insuranceCompanySchema } from "@/lib/validations/insurance";

describe("insuranceCompanySchema", () => {
  it("accepts a minimal valid payer", () => {
    expect(insuranceCompanySchema.safeParse({ name: "Aetna", isActive: true }).success).toBe(true);
  });

  it("rejects an empty payer name", () => {
    expect(insuranceCompanySchema.safeParse({ name: "", isActive: true }).success).toBe(false);
  });

  it("rejects a malformed website", () => {
    const result = insuranceCompanySchema.safeParse({
      name: "Aetna",
      website: "not a url",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a bare-domain website", () => {
    const result = insuranceCompanySchema.safeParse({
      name: "Aetna",
      website: "aetna.com",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});
