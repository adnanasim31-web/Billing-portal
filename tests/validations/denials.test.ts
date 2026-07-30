import { describe, expect, it } from "vitest";
import { denialUpdateSchema, denialSearchSchema } from "@/lib/validations/denials";

describe("denialUpdateSchema", () => {
  const base = {
    category: "coding_error" as const,
    resolutionStatus: "in_progress" as const,
  };

  it("accepts a valid in-progress update", () => {
    expect(denialUpdateSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an invalid category", () => {
    expect(denialUpdateSchema.safeParse({ ...base, category: "user_error" }).success).toBe(false);
  });

  it("rejects a malformed follow-up date", () => {
    expect(denialUpdateSchema.safeParse({ ...base, followUpDate: "01/15/2026" }).success).toBe(false);
  });

  it("accepts a well-formed follow-up date", () => {
    expect(denialUpdateSchema.safeParse({ ...base, followUpDate: "2026-01-15" }).success).toBe(true);
  });

  it("requires resolution notes when marking resolved", () => {
    expect(denialUpdateSchema.safeParse({ ...base, resolutionStatus: "resolved" }).success).toBe(false);
    expect(
      denialUpdateSchema.safeParse({ ...base, resolutionStatus: "resolved", resolutionNotes: "Appeal won" }).success
    ).toBe(true);
  });

  it("requires resolution notes when writing off", () => {
    expect(denialUpdateSchema.safeParse({ ...base, resolutionStatus: "written_off" }).success).toBe(false);
    expect(
      denialUpdateSchema.safeParse({ ...base, resolutionStatus: "written_off", resolutionNotes: "Timely filing missed" })
        .success
    ).toBe(true);
  });

  it("does not require resolution notes for open/in_progress/appealed", () => {
    expect(denialUpdateSchema.safeParse({ ...base, resolutionStatus: "open" }).success).toBe(true);
    expect(denialUpdateSchema.safeParse({ ...base, resolutionStatus: "appealed" }).success).toBe(true);
  });
});

describe("denialSearchSchema", () => {
  it("defaults resolutionStatus and category to all", () => {
    const result = denialSearchSchema.safeParse({});
    expect(result.success && result.data.resolutionStatus).toBe("all");
    expect(result.success && result.data.category).toBe("all");
  });

  it("accepts valid filters", () => {
    expect(denialSearchSchema.safeParse({ resolutionStatus: "open", category: "eligibility" }).success).toBe(true);
  });

  it("rejects an invalid resolutionStatus filter", () => {
    expect(denialSearchSchema.safeParse({ resolutionStatus: "closed" }).success).toBe(false);
  });
});
