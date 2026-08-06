import { describe, expect, it } from "vitest";
import { computeStatementTotals } from "@/lib/services/patient-statement-service";

describe("computeStatementTotals", () => {
  it("returns zero totals for no claims", () => {
    expect(computeStatementTotals([])).toEqual({
      totalCharged: 0,
      totalPaid: 0,
      totalAdjusted: 0,
      totalBalance: 0,
    });
  });

  it("sums charge, paid, adjustment, and balance across claims", () => {
    const totals = computeStatementTotals([
      { totalChargeAmount: 200, totalPaidAmount: 150, totalAdjustmentAmount: 10, balanceAmount: 40 },
      { totalChargeAmount: 300, totalPaidAmount: 300, totalAdjustmentAmount: 0, balanceAmount: 0 },
    ]);

    expect(totals).toEqual({
      totalCharged: 500,
      totalPaid: 450,
      totalAdjusted: 10,
      totalBalance: 40,
    });
  });

  it("handles a single claim with an outstanding balance", () => {
    const totals = computeStatementTotals([
      { totalChargeAmount: 120.5, totalPaidAmount: 0, totalAdjustmentAmount: 0, balanceAmount: 120.5 },
    ]);

    expect(totals.totalBalance).toBe(120.5);
  });
});
