import { describe, expect, it } from "vitest";
import { providerMessageSchema } from "@/lib/validations/provider-messaging";

describe("providerMessageSchema", () => {
  it("accepts a valid message", () => {
    expect(providerMessageSchema.safeParse({ body: "When will claim #123 be resolved?" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(providerMessageSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a message over the max length", () => {
    expect(providerMessageSchema.safeParse({ body: "a".repeat(4001) }).success).toBe(false);
  });
});
