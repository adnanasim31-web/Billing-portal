import { describe, expect, it } from "vitest";
import { providerPortalCredentialsSchema, providerSchema, providerScheduleSchema } from "@/lib/validations/providers";

describe("providerSchema", () => {
  const baseIndividual = {
    providerType: "individual" as const,
    firstName: "Sarah",
    lastName: "Clark",
    npi: "1234567890",
    specialty: "Gastroenterology",
    status: "active" as const,
  };

  it("accepts a valid individual provider", () => {
    expect(providerSchema.safeParse(baseIndividual).success).toBe(true);
  });

  it("rejects an individual provider missing a last name", () => {
    const result = providerSchema.safeParse({ ...baseIndividual, lastName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an NPI that isn't exactly 10 digits", () => {
    expect(providerSchema.safeParse({ ...baseIndividual, npi: "123" }).success).toBe(false);
    expect(providerSchema.safeParse({ ...baseIndividual, npi: "12345678901" }).success).toBe(false);
  });

  it("accepts a valid organization provider without first/last name", () => {
    const result = providerSchema.safeParse({
      providerType: "organization",
      organizationName: "Westside Radiology Group",
      npi: "1234567890",
      specialty: "Radiology",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an organization provider missing an organization name", () => {
    const result = providerSchema.safeParse({
      providerType: "organization",
      npi: "1234567890",
      specialty: "Radiology",
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed DEA number", () => {
    const result = providerSchema.safeParse({ ...baseIndividual, deaNumber: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed DEA number", () => {
    const result = providerSchema.safeParse({ ...baseIndividual, deaNumber: "AB1234563" });
    expect(result.success).toBe(true);
  });
});

describe("providerScheduleSchema", () => {
  it("rejects an end time before the start time", () => {
    const result = providerScheduleSchema.safeParse({
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid schedule block", () => {
    const result = providerScheduleSchema.safeParse({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      location: "Main office",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a day of week outside 0-6", () => {
    const result = providerScheduleSchema.safeParse({ dayOfWeek: 7, startTime: "09:00", endTime: "17:00" });
    expect(result.success).toBe(false);
  });
});

describe("providerPortalCredentialsSchema", () => {
  it("accepts both fields blank - no portal access being set up", () => {
    expect(providerPortalCredentialsSchema.safeParse({ email: "", password: "" }).success).toBe(true);
  });

  it("accepts a valid email and strong password", () => {
    const result = providerPortalCredentialsSchema.safeParse({
      email: "dr.clark@example.com",
      password: "Str0ng!Passw0rd",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = providerPortalCredentialsSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a weak password", () => {
    const result = providerPortalCredentialsSchema.safeParse({ email: "", password: "short" });
    expect(result.success).toBe(false);
  });
});
