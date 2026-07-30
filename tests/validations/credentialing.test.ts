import { describe, expect, it } from "vitest";
import { credentialSchema, credentialSearchSchema } from "@/lib/validations/credentialing";

describe("credentialSchema", () => {
  it("accepts a minimal valid credential", () => {
    expect(credentialSchema.safeParse({ credentialType: "state_license" }).success).toBe(true);
  });

  it("defaults status to active", () => {
    const result = credentialSchema.safeParse({ credentialType: "npi" });
    expect(result.success && result.data.status).toBe("active");
  });

  it("rejects an invalid credential type", () => {
    expect(credentialSchema.safeParse({ credentialType: "passport" }).success).toBe(false);
  });

  it("rejects a malformed expiration date", () => {
    expect(
      credentialSchema.safeParse({ credentialType: "dea", expirationDate: "06/15/2026" }).success
    ).toBe(false);
  });

  it("accepts a well-formed expiration date", () => {
    expect(
      credentialSchema.safeParse({ credentialType: "dea", expirationDate: "2026-06-15" }).success
    ).toBe(true);
  });
});

describe("credentialSearchSchema", () => {
  it("defaults status to all", () => {
    const result = credentialSearchSchema.safeParse({});
    expect(result.success && result.data.status).toBe("all");
  });

  it("transforms expiringSoon to a boolean", () => {
    const result = credentialSearchSchema.safeParse({ expiringSoon: "true" });
    expect(result.success && result.data.expiringSoon).toBe(true);
  });

  it("rejects an invalid status filter", () => {
    expect(credentialSearchSchema.safeParse({ status: "suspended" }).success).toBe(false);
  });
});
