import { describe, expect, it } from "vitest";
import { providerPortalLoginSchema } from "@/lib/validations/provider-portal";

describe("providerPortalLoginSchema", () => {
  it("accepts a valid email/password", () => {
    expect(
      providerPortalLoginSchema.safeParse({ email: "provider@example.com", password: "hunter2" }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(providerPortalLoginSchema.safeParse({ email: "not-an-email", password: "hunter2" }).success).toBe(
      false
    );
  });

  it("rejects an empty password", () => {
    expect(providerPortalLoginSchema.safeParse({ email: "provider@example.com", password: "" }).success).toBe(
      false
    );
  });
});
