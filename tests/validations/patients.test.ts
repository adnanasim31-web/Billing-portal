import { describe, expect, it } from "vitest";
import {
  patientSchema,
  patientInsuranceSchema,
  patientDocumentMetaSchema,
  patientHistoryEntrySchema,
  patientNoteSchema,
} from "@/lib/validations/patients";

describe("patientSchema", () => {
  const base = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-05-15",
    sex: "female" as const,
    preferredLanguage: "en",
    status: "active" as const,
  };

  it("accepts a minimal valid patient", () => {
    expect(patientSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a date of birth in the future", () => {
    const result = patientSchema.safeParse({ ...base, dateOfBirth: "2999-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = patientSchema.safeParse({ ...base, dateOfBirth: "05/15/1990" });
    expect(result.success).toBe(false);
  });

  it("rejects an ssnLast4 that isn't exactly 4 digits", () => {
    const result = patientSchema.safeParse({ ...base, ssnLast4: "12" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty ssnLast4", () => {
    const result = patientSchema.safeParse({ ...base, ssnLast4: "" });
    expect(result.success).toBe(true);
  });
});

describe("patientInsuranceSchema", () => {
  const base = {
    rank: "primary" as const,
    payerName: "Aetna",
    policyNumber: "POL123",
    subscriberName: "Jane Doe",
    subscriberRelationship: "self" as const,
    isActive: true,
  };

  it("accepts a minimal valid policy", () => {
    expect(patientInsuranceSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a termination date before the effective date", () => {
    const result = patientInsuranceSchema.safeParse({
      ...base,
      effectiveDate: "2024-06-01",
      terminationDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a termination date after the effective date", () => {
    const result = patientInsuranceSchema.safeParse({
      ...base,
      effectiveDate: "2024-01-01",
      terminationDate: "2024-06-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("patientDocumentMetaSchema", () => {
  it("rejects a file larger than 25MB", () => {
    const result = patientDocumentMetaSchema.safeParse({
      fileName: "scan.pdf",
      filePath: "org/patient/scan.pdf",
      fileSize: 26_214_401,
      mimeType: "application/pdf",
      category: "medical_record",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a file within the size limit", () => {
    const result = patientDocumentMetaSchema.safeParse({
      fileName: "scan.pdf",
      filePath: "org/patient/scan.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      category: "medical_record",
    });
    expect(result.success).toBe(true);
  });
});

describe("patientHistoryEntrySchema", () => {
  it("requires a non-empty description", () => {
    const result = patientHistoryEntrySchema.safeParse({
      entryType: "allergy",
      description: "",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});

describe("patientNoteSchema", () => {
  it("requires a non-empty body", () => {
    expect(patientNoteSchema.safeParse({ noteType: "general", body: "", isPinned: false }).success).toBe(
      false
    );
  });

  it("accepts a valid note", () => {
    expect(
      patientNoteSchema.safeParse({ noteType: "billing", body: "Called about balance", isPinned: true })
        .success
    ).toBe(true);
  });
});
