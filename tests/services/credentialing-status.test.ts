import { describe, expect, it } from "vitest";
import { isExpired, isExpiringSoon } from "@/lib/services/credentialing-status";

const TODAY = "2026-06-15";

describe("isExpired", () => {
  it("is false when there is no expiration date", () => {
    expect(isExpired(null, TODAY)).toBe(false);
  });

  it("is false on the exact expiration date", () => {
    expect(isExpired(TODAY, TODAY)).toBe(false);
  });

  it("is true the day after expiration", () => {
    expect(isExpired("2026-06-14", TODAY)).toBe(true);
  });

  it("is false for a future expiration date", () => {
    expect(isExpired("2026-07-01", TODAY)).toBe(false);
  });
});

describe("isExpiringSoon", () => {
  it("is false when there is no expiration date", () => {
    expect(isExpiringSoon(null, TODAY)).toBe(false);
  });

  it("is false once already expired", () => {
    expect(isExpiringSoon("2026-06-14", TODAY)).toBe(false);
  });

  it("is true within the default 60-day window", () => {
    expect(isExpiringSoon("2026-07-01", TODAY)).toBe(true);
  });

  it("is true on the exact boundary day", () => {
    expect(isExpiringSoon("2026-08-14", TODAY)).toBe(true);
  });

  it("is false just past the default window", () => {
    expect(isExpiringSoon("2026-08-15", TODAY)).toBe(false);
  });

  it("respects a custom warning window", () => {
    expect(isExpiringSoon("2026-06-20", TODAY, 10)).toBe(true);
    expect(isExpiringSoon("2026-07-01", TODAY, 10)).toBe(false);
  });
});
