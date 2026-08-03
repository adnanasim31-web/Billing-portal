import { describe, expect, it } from "vitest";
import {
  patientPortalLoginSchema,
  patientPortalAcceptInviteSchema,
  patientPortalPaymentSchema,
} from "@/lib/validations/patient-portal";

describe("patientPortalLoginSchema", () => {
  it("accepts a valid email/password", () => {
    expect(patientPortalLoginSchema.safeParse({ email: "patient@example.com", password: "hunter2" }).success).toBe(
      true
    );
  });

  it("rejects an invalid email", () => {
    expect(patientPortalLoginSchema.safeParse({ email: "not-an-email", password: "hunter2" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(patientPortalLoginSchema.safeParse({ email: "patient@example.com", password: "" }).success).toBe(false);
  });
});

describe("patientPortalAcceptInviteSchema", () => {
  const validPassword = "Str0ng!Passw0rd";

  it("accepts matching strong passwords", () => {
    const result = patientPortalAcceptInviteSchema.safeParse({
      token: "abc123",
      password: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = patientPortalAcceptInviteSchema.safeParse({
      token: "abc123",
      password: validPassword,
      confirmPassword: "Different1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing token", () => {
    const result = patientPortalAcceptInviteSchema.safeParse({
      token: "",
      password: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(false);
  });
});

describe("patientPortalPaymentSchema", () => {
  it("accepts a positive amount", () => {
    expect(patientPortalPaymentSchema.safeParse({ amount: 42.5 }).success).toBe(true);
  });

  it("rejects zero or negative amounts", () => {
    expect(patientPortalPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(patientPortalPaymentSchema.safeParse({ amount: -5 }).success).toBe(false);
  });

  it("rejects amounts over the max", () => {
    expect(patientPortalPaymentSchema.safeParse({ amount: 1_000_000 }).success).toBe(false);
  });
});
