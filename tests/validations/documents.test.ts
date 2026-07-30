import { describe, expect, it } from "vitest";
import { documentMetaSchema, documentSearchSchema } from "@/lib/validations/documents";

describe("documentMetaSchema", () => {
  const base = {
    fileName: "contract.pdf",
    filePath: "org1/other/uuid-contract.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
  };

  it("accepts a minimal valid document", () => {
    expect(documentMetaSchema.safeParse(base).success).toBe(true);
  });

  it("defaults category to other", () => {
    const result = documentMetaSchema.safeParse(base);
    expect(result.success && result.data.category).toBe("other");
  });

  it("rejects a zero or negative file size", () => {
    expect(documentMetaSchema.safeParse({ ...base, fileSize: 0 }).success).toBe(false);
  });

  it("rejects an invalid entity type", () => {
    expect(documentMetaSchema.safeParse({ ...base, entityType: "organization" }).success).toBe(false);
  });

  it("accepts a valid entity tag", () => {
    expect(
      documentMetaSchema.safeParse({
        ...base,
        entityType: "provider",
        entityId: "11111111-1111-1111-1111-111111111111",
      }).success
    ).toBe(true);
  });
});

describe("documentSearchSchema", () => {
  it("defaults category to all", () => {
    const result = documentSearchSchema.safeParse({});
    expect(result.success && result.data.category).toBe("all");
  });

  it("rejects an invalid category filter", () => {
    expect(documentSearchSchema.safeParse({ category: "invoice" }).success).toBe(false);
  });
});
