import { describe, expect, it } from "vitest";
import { changePlanSchema } from "@/lib/validations/subscription";

describe("changePlanSchema", () => {
  it("accepts a valid plan change", () => {
    expect(changePlanSchema.safeParse({ planTier: "professional", billingCycle: "annual" }).success).toBe(true);
  });

  it("rejects an invalid plan tier", () => {
    expect(changePlanSchema.safeParse({ planTier: "ultimate", billingCycle: "monthly" }).success).toBe(false);
  });

  it("rejects an invalid billing cycle", () => {
    expect(changePlanSchema.safeParse({ planTier: "starter", billingCycle: "weekly" }).success).toBe(false);
  });

  it("requires both fields", () => {
    expect(changePlanSchema.safeParse({ planTier: "starter" }).success).toBe(false);
  });
});
