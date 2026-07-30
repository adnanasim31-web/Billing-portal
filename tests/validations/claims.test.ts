import { describe, expect, it } from "vitest";
import {
  claimSchema,
  claimDiagnosisSchema,
  claimLineSchema,
  claimStatusChangeSchema,
} from "@/lib/validations/claims";

describe("claimSchema", () => {
  const base = {
    patientId: "11111111-1111-1111-1111-111111111111",
    providerId: "22222222-2222-2222-2222-222222222222",
    serviceDateFrom: "2026-01-15",
    serviceDateTo: "2026-01-15",
  };

  it("accepts a valid claim shell", () => {
    expect(claimSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a service end date before the start date", () => {
    const result = claimSchema.safeParse({ ...base, serviceDateFrom: "2026-01-15", serviceDateTo: "2026-01-10" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid patientId", () => {
    const result = claimSchema.safeParse({ ...base, patientId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("claimDiagnosisSchema", () => {
  it("accepts a valid diagnosis", () => {
    expect(claimDiagnosisSchema.safeParse({ sequence: 1, icd10Code: "E11.9" }).success).toBe(true);
  });

  it("rejects a sequence outside 1-12", () => {
    expect(claimDiagnosisSchema.safeParse({ sequence: 13, icd10Code: "E11.9" }).success).toBe(false);
    expect(claimDiagnosisSchema.safeParse({ sequence: 0, icd10Code: "E11.9" }).success).toBe(false);
  });

  it("rejects a malformed ICD-10 code", () => {
    expect(claimDiagnosisSchema.safeParse({ sequence: 1, icd10Code: "12345" }).success).toBe(false);
  });
});

describe("claimLineSchema", () => {
  const base = {
    lineNumber: 1,
    procedureCode: "99213",
    diagnosisPointers: [1],
    units: 1,
    chargeAmount: 150,
  };

  it("accepts a valid CPT line", () => {
    expect(claimLineSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid HCPCS line", () => {
    expect(claimLineSchema.safeParse({ ...base, procedureCode: "A0425" }).success).toBe(true);
  });

  it("rejects a malformed procedure code", () => {
    expect(claimLineSchema.safeParse({ ...base, procedureCode: "abc" }).success).toBe(false);
  });

  it("rejects a malformed modifier", () => {
    expect(claimLineSchema.safeParse({ ...base, modifier1: "ABC" }).success).toBe(false);
  });

  it("accepts a valid modifier", () => {
    expect(claimLineSchema.safeParse({ ...base, modifier1: "25" }).success).toBe(true);
  });

  it("requires at least one diagnosis pointer", () => {
    expect(claimLineSchema.safeParse({ ...base, diagnosisPointers: [] }).success).toBe(false);
  });
});

describe("claimStatusChangeSchema", () => {
  it("requires a note when rejecting", () => {
    expect(claimStatusChangeSchema.safeParse({ status: "rejected" }).success).toBe(false);
    expect(claimStatusChangeSchema.safeParse({ status: "rejected", note: "Missing NPI" }).success).toBe(true);
  });

  it("requires a note when denying", () => {
    expect(claimStatusChangeSchema.safeParse({ status: "denied" }).success).toBe(false);
    expect(claimStatusChangeSchema.safeParse({ status: "denied", note: "Not medically necessary" }).success).toBe(
      true
    );
  });

  it("does not require a note for other statuses", () => {
    expect(claimStatusChangeSchema.safeParse({ status: "ready" }).success).toBe(true);
    expect(claimStatusChangeSchema.safeParse({ status: "submitted" }).success).toBe(true);
  });
});
