import { describe, expect, it } from "vitest";
import { buildDocumentStoragePath } from "@/lib/services/patient-document-service";

describe("buildDocumentStoragePath", () => {
  it("scopes the path by organization then patient", () => {
    const path = buildDocumentStoragePath({
      organizationId: "org-1",
      patientId: "patient-1",
      fileName: "insurance-card.png",
    });
    expect(path.startsWith("org-1/patient-1/")).toBe(true);
  });

  it("sanitizes unsafe characters in the file name", () => {
    const path = buildDocumentStoragePath({
      organizationId: "org-1",
      patientId: "patient-1",
      fileName: "my file (final)!.pdf",
    });
    expect(path).not.toMatch(/[()! ]/);
    expect(path.endsWith(".pdf")).toBe(true);
  });

  it("produces a unique path on every call for the same file name", () => {
    const params = { organizationId: "org-1", patientId: "patient-1", fileName: "same.pdf" };
    const first = buildDocumentStoragePath(params);
    const second = buildDocumentStoragePath(params);
    expect(first).not.toBe(second);
  });
});
