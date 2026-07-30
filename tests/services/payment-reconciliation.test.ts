import { describe, expect, it } from "vitest";
import { isClaimFullyReconciled } from "@/lib/services/payment-reconciliation";

describe("isClaimFullyReconciled", () => {
  it("is true when paid + adjustment exactly equals the charge", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 120, totalAdjustmentAmount: 30 })
    ).toBe(true);
  });

  it("is true when paid + adjustment exceeds the charge (overpayment)", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 160, totalAdjustmentAmount: 0 })
    ).toBe(true);
  });

  it("is false when there is still an open balance", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 100, totalAdjustmentAmount: 0 })
    ).toBe(false);
  });

  it("is false when nothing has been paid or adjusted yet", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 0, totalAdjustmentAmount: 0 })
    ).toBe(false);
  });

  it("tolerates sub-cent floating point rounding", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 149.995, totalAdjustmentAmount: 0 })
    ).toBe(true);
  });

  it("is false just outside the rounding tolerance", () => {
    expect(
      isClaimFullyReconciled({ totalChargeAmount: 150, totalPaidAmount: 149.98, totalAdjustmentAmount: 0 })
    ).toBe(false);
  });
});
