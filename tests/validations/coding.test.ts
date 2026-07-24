import { describe, expect, it } from "vitest";
import { isValidCodeFormat, codingFavoriteSchema } from "@/lib/validations/coding";

describe("isValidCodeFormat", () => {
  it("validates ICD-10 codes", () => {
    expect(isValidCodeFormat("icd10", "E11.9")).toBe(true);
    expect(isValidCodeFormat("icd10", "S93.401A")).toBe(true);
    expect(isValidCodeFormat("icd10", "12345")).toBe(false);
  });

  it("validates CPT codes", () => {
    expect(isValidCodeFormat("cpt", "99213")).toBe(true);
    expect(isValidCodeFormat("cpt", "9921")).toBe(false);
    expect(isValidCodeFormat("cpt", "A0425")).toBe(false);
  });

  it("validates HCPCS codes", () => {
    expect(isValidCodeFormat("hcpcs", "A0425")).toBe(true);
    expect(isValidCodeFormat("hcpcs", "G0008")).toBe(true);
    expect(isValidCodeFormat("hcpcs", "99213")).toBe(false);
  });

  it("validates modifiers", () => {
    expect(isValidCodeFormat("modifier", "25")).toBe(true);
    expect(isValidCodeFormat("modifier", "LT")).toBe(true);
    expect(isValidCodeFormat("modifier", "ABC")).toBe(false);
  });
});

describe("codingFavoriteSchema", () => {
  it("accepts a valid favorite", () => {
    expect(codingFavoriteSchema.safeParse({ codeType: "icd10", code: "E11.9" }).success).toBe(true);
  });

  it("rejects an invalid code type", () => {
    const result = codingFavoriteSchema.safeParse({ codeType: "snomed", code: "E11.9" });
    expect(result.success).toBe(false);
  });
});
