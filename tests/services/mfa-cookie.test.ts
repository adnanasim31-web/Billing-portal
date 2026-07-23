import { beforeAll, describe, expect, it } from "vitest";
import { signMfaCookieValue, isMfaCookieValid } from "@/lib/mfa-cookie";

beforeAll(() => {
  process.env.APP_SECRET = "test-secret-value";
});

describe("mfa cookie signing", () => {
  it("produces a deterministic signature for the same user id", () => {
    const a = signMfaCookieValue("user-123");
    const b = signMfaCookieValue("user-123");
    expect(a).toBe(b);
  });

  it("produces different signatures for different user ids", () => {
    expect(signMfaCookieValue("user-123")).not.toBe(signMfaCookieValue("user-456"));
  });

  it("validates a matching cookie value", () => {
    const value = signMfaCookieValue("user-123");
    expect(isMfaCookieValid("user-123", value)).toBe(true);
  });

  it("rejects a missing or mismatched cookie value", () => {
    expect(isMfaCookieValid("user-123", undefined)).toBe(false);
    expect(isMfaCookieValid("user-123", "garbage")).toBe(false);
  });
});
