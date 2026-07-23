import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/services/auth-service";

describe("slugify", () => {
  it("lowercases and hyphenates organization names", () => {
    expect(slugify("Westlake Medical Group")).toBe("westlake-medical-group");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Dr. Smith's Clinic & Co.")).toBe("dr-smith-s-clinic-co");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --Acme Health--  ")).toBe("acme-health");
  });

  it("truncates to 60 characters", () => {
    const longName = "A".repeat(100);
    expect(slugify(longName).length).toBeLessThanOrEqual(60);
  });
});
