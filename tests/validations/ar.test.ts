import { describe, expect, it } from "vitest";
import { arNoteSchema, arSearchSchema } from "@/lib/validations/ar";

describe("arNoteSchema", () => {
  it("accepts a valid note", () => {
    expect(arNoteSchema.safeParse({ body: "Called payer, said reprocessing." }).success).toBe(true);
  });

  it("rejects an empty note", () => {
    expect(arNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a note over the max length", () => {
    expect(arNoteSchema.safeParse({ body: "a".repeat(2001) }).success).toBe(false);
  });
});

describe("arSearchSchema", () => {
  it("defaults agingBucket to all", () => {
    const result = arSearchSchema.safeParse({});
    expect(result.success && result.data.agingBucket).toBe("all");
  });

  it("accepts a valid aging bucket filter", () => {
    expect(arSearchSchema.safeParse({ agingBucket: "31_60" }).success).toBe(true);
  });

  it("rejects an invalid aging bucket filter", () => {
    expect(arSearchSchema.safeParse({ agingBucket: "ancient" }).success).toBe(false);
  });
});
