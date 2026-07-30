import { describe, expect, it } from "vitest";
import { crmLeadSchema, crmActivitySchema, crmSearchSchema } from "@/lib/validations/crm";

describe("crmLeadSchema", () => {
  it("accepts a minimal valid lead", () => {
    expect(crmLeadSchema.safeParse({ contactName: "Jane Doe" }).success).toBe(true);
  });

  it("defaults stage to lead and source to other", () => {
    const result = crmLeadSchema.safeParse({ contactName: "Jane Doe" });
    expect(result.success && result.data.stage).toBe("lead");
    expect(result.success && result.data.source).toBe("other");
  });

  it("rejects an empty contact name", () => {
    expect(crmLeadSchema.safeParse({ contactName: "" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(crmLeadSchema.safeParse({ contactName: "Jane Doe", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a negative estimated value", () => {
    expect(crmLeadSchema.safeParse({ contactName: "Jane Doe", estimatedValue: -100 }).success).toBe(false);
  });
});

describe("crmActivitySchema", () => {
  it("accepts a valid activity", () => {
    expect(crmActivitySchema.safeParse({ activityType: "call", body: "Left voicemail" }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(crmActivitySchema.safeParse({ activityType: "note", body: "" }).success).toBe(false);
  });
});

describe("crmSearchSchema", () => {
  it("defaults stage to all", () => {
    const result = crmSearchSchema.safeParse({});
    expect(result.success && result.data.stage).toBe("all");
  });

  it("rejects an invalid stage filter", () => {
    expect(crmSearchSchema.safeParse({ stage: "won" }).success).toBe(false);
  });
});
