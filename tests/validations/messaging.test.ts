import { describe, expect, it } from "vitest";
import { channelSchema, messageSchema } from "@/lib/validations/messaging";

describe("channelSchema", () => {
  it("accepts a valid channel", () => {
    expect(channelSchema.safeParse({ name: "General" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(channelSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name over the max length", () => {
    expect(channelSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("accepts a valid message", () => {
    expect(messageSchema.safeParse({ body: "Hello team" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(messageSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a message over the max length", () => {
    expect(messageSchema.safeParse({ body: "a".repeat(4001) }).success).toBe(false);
  });
});
