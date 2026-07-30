import { describe, expect, it } from "vitest";
import { scrubClaim } from "@/lib/services/claim-scrubbing";

const validClaim = {
  payerCompanyId: "33333333-3333-3333-3333-333333333333",
  serviceDateFrom: "2026-01-15",
  serviceDateTo: "2026-01-15",
};

const validDiagnoses = [{ sequence: 1, icd10Code: "E11.9" }];

const validLine = {
  lineNumber: 1,
  procedureCode: "99213",
  modifier1: null,
  modifier2: null,
  diagnosisPointers: [1],
  units: 1,
  chargeAmount: 150,
};

const validLines = [validLine];

describe("scrubClaim", () => {
  it("is ready to submit for a complete, valid claim", () => {
    const result = scrubClaim(validClaim, validDiagnoses, validLines);
    expect(result.isReadyToSubmit).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns but does not error when there is no payer", () => {
    const result = scrubClaim({ ...validClaim, payerCompanyId: null }, validDiagnoses, validLines);
    expect(result.isReadyToSubmit).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("errors when there are no diagnoses", () => {
    const result = scrubClaim(validClaim, [], validLines);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("diagnosis"))).toBe(true);
  });

  it("errors when there are no procedure lines", () => {
    const result = scrubClaim(validClaim, validDiagnoses, []);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("procedure line"))).toBe(true);
  });

  it("errors on a malformed ICD-10 code", () => {
    const result = scrubClaim(validClaim, [{ sequence: 1, icd10Code: "12345" }], validLines);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("ICD-10"))).toBe(true);
  });

  it("errors on a malformed procedure code", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, procedureCode: "abc" }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("CPT/HCPCS"))).toBe(true);
  });

  it("errors on a malformed modifier", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, modifier1: "ABC" }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("modifier"))).toBe(true);
  });

  it("errors when a line points to a diagnosis that does not exist", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, diagnosisPointers: [2] }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("does not exist"))).toBe(true);
  });

  it("errors when a line has no diagnosis pointers", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, diagnosisPointers: [] }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("at least one diagnosis"))).toBe(true);
  });

  it("errors on a zero or negative charge amount", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, chargeAmount: 0 }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("charge amount"))).toBe(true);
  });

  it("errors on zero units", () => {
    const result = scrubClaim(validClaim, validDiagnoses, [{ ...validLine, units: 0 }]);
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("unit"))).toBe(true);
  });

  it("errors when the service end date is before the start date", () => {
    const result = scrubClaim(
      { ...validClaim, serviceDateFrom: "2026-01-15", serviceDateTo: "2026-01-10" },
      validDiagnoses,
      validLines
    );
    expect(result.isReadyToSubmit).toBe(false);
    expect(result.errors.some((e) => e.includes("Service end date"))).toBe(true);
  });
});
