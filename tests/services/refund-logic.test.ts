import { describe, expect, it } from "vitest";
import { computeAllocationRefundableAmount, validateRefundAmount } from "@/lib/services/refund-logic";

describe("computeAllocationRefundableAmount", () => {
  it("subtracts prior refunds from what was paid", () => {
    expect(computeAllocationRefundableAmount({ paidAmount: 100, priorRefundsTotal: 40 })).toBe(60);
  });

  it("returns the full paid amount when nothing has been refunded yet", () => {
    expect(computeAllocationRefundableAmount({ paidAmount: 75, priorRefundsTotal: 0 })).toBe(75);
  });

  it("returns 0 once fully refunded", () => {
    expect(computeAllocationRefundableAmount({ paidAmount: 50, priorRefundsTotal: 50 })).toBe(0);
  });
});

describe("validateRefundAmount", () => {
  it("rejects a zero or negative amount", () => {
    expect(validateRefundAmount(0, 100)).not.toBeNull();
    expect(validateRefundAmount(-5, 100)).not.toBeNull();
  });

  it("accepts an amount within the refundable balance", () => {
    expect(validateRefundAmount(50, 100)).toBeNull();
  });

  it("accepts an amount exactly equal to the refundable balance", () => {
    expect(validateRefundAmount(100, 100)).toBeNull();
  });

  it("rejects an amount greater than what was actually paid", () => {
    expect(validateRefundAmount(100.5, 100)).not.toBeNull();
  });

  it("tolerates floating-point rounding at the boundary", () => {
    expect(validateRefundAmount(30.005, 30)).toBeNull();
  });
});
