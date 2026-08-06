/**
 * Pure - no DB access, so it's cheap to unit test. Mirrors
 * payment-reconciliation.ts's role: the math the service layer needs before
 * it touches the database.
 */
const BALANCE_EPSILON = 0.01;

export interface ClaimLineBalance {
  chargeAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
}

export function computeLineRemainingBalance(line: ClaimLineBalance): number {
  return line.chargeAmount - line.paidAmount - line.adjustmentAmount;
}

/** Returns an error message if the amount isn't postable against this line, or null if it's fine. */
export function validateAdjustmentAmount(amount: number, remainingBalance: number): string | null {
  if (amount <= 0) return "Adjustment amount must be greater than zero.";
  if (amount > remainingBalance + BALANCE_EPSILON) {
    return "Adjustment amount cannot exceed the line's remaining balance.";
  }
  return null;
}
