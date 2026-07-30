import { describe, expect, it } from "vitest";
import { reportDateRangeSchema, reportExportSchema } from "@/lib/validations/reports";

describe("reportDateRangeSchema", () => {
  it("accepts an empty range", () => {
    expect(reportDateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a well-formed date range", () => {
    expect(reportDateRangeSchema.safeParse({ from: "2026-01-01", to: "2026-03-31" }).success).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(reportDateRangeSchema.safeParse({ from: "01/01/2026" }).success).toBe(false);
  });
});

describe("reportExportSchema", () => {
  it("requires a valid export type", () => {
    expect(reportExportSchema.safeParse({ type: "status" }).success).toBe(true);
    expect(reportExportSchema.safeParse({ type: "unknown" }).success).toBe(false);
    expect(reportExportSchema.safeParse({}).success).toBe(false);
  });
});
