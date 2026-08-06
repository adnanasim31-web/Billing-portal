import { describe, expect, it } from "vitest";
import { computeLineRemainingBalance, validateAdjustmentAmount } from "@/lib/services/claim-adjustment-logic";

describe("computeLineRemainingBalance", () => {
  it("subtracts paid and adjustment amounts from the charge", () => {
    expect(
      computeLineRemainingBalance({ chargeAmount: 100, paidAmount: 60, adjustmentAmount: 10 })
    ).toBe(30);
  });

  it("returns 0 when the line is fully reconciled", () => {
    expect(
      computeLineRemainingBalance({ chargeAmount: 100, paidAmount: 80, adjustmentAmount: 20 })
    ).toBe(0);
  });
});

describe("validateAdjustmentAmount", () => {
  it("rejects a zero or negative amount", () => {
    expect(validateAdjustmentAmount(0, 100)).not.toBeNull();
    expect(validateAdjustmentAmount(-5, 100)).not.toBeNull();
  });

  it("accepts an amount within the remaining balance", () => {
    expect(validateAdjustmentAmount(50, 100)).toBeNull();
  });

  it("accepts an amount exactly equal to the remaining balance", () => {
    expect(validateAdjustmentAmount(100, 100)).toBeNull();
  });

  it("rejects an amount greater than the remaining balance", () => {
    expect(validateAdjustmentAmount(100.5, 100)).not.toBeNull();
  });

  it("tolerates floating-point rounding at the balance boundary", () => {
    expect(validateAdjustmentAmount(30.005, 30)).toBeNull();
  });
});
