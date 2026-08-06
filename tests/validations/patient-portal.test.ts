import { describe, expect, it } from "vitest";
import {
  patientPortalLoginSchema,
  patientPortalAcceptInviteSchema,
  patientPortalPaymentSchema,
  patientPortalProfileSchema,
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

describe("patientPortalProfileSchema", () => {
  const valid = {
    phoneMobile: "(555) 123-4567",
    phoneHome: "",
    addressLine1: "123 Main St",
    addressLine2: "",
    city: "Springfield",
    state: "IL",
    postalCode: "62704",
  };

  it("accepts fully filled-in contact details", () => {
    expect(patientPortalProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all-blank fields (nothing on file yet)", () => {
    const result = patientPortalProfileSchema.safeParse({
      phoneMobile: "",
      phoneHome: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    const result = patientPortalProfileSchema.safeParse({ ...valid, phoneMobile: "not-a-phone" });
    expect(result.success).toBe(false);
  });

  it("rejects a state longer than 2 characters", () => {
    const result = patientPortalProfileSchema.safeParse({ ...valid, state: "Illinois" });
    expect(result.success).toBe(false);
  });

  it("has no way to change name, date of birth, or email", () => {
    expect("firstName" in patientPortalProfileSchema.shape).toBe(false);
    expect("email" in patientPortalProfileSchema.shape).toBe(false);
  });
});
