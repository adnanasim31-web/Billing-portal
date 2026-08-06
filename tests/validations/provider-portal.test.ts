import { describe, expect, it } from "vitest";
import { providerPortalDocumentMetaSchema, providerPortalLoginSchema } from "@/lib/validations/provider-portal";

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

describe("providerPortalDocumentMetaSchema", () => {
  const base = {
    fileName: "license.pdf",
    filePath: "org-id/provider_credential/uuid-license.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
  };

  it("accepts valid document metadata", () => {
    expect(providerPortalDocumentMetaSchema.safeParse(base).success).toBe(true);
  });

  it("accepts optional notes", () => {
    expect(providerPortalDocumentMetaSchema.safeParse({ ...base, notes: "Renewed 2026" }).success).toBe(true);
  });

  it("rejects a file over the size limit", () => {
    expect(providerPortalDocumentMetaSchema.safeParse({ ...base, fileSize: 26214401 }).success).toBe(false);
  });

  it("rejects a missing file name", () => {
    expect(providerPortalDocumentMetaSchema.safeParse({ ...base, fileName: "" }).success).toBe(false);
  });
});
