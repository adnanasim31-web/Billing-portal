/**
 * Pure - no DB access, so it's cheap to unit test. Mirrors
 * claim-adjustment-logic.ts's role for the refund side: the math the
 * service layer needs before it touches the database.
 */
const REFUND_EPSILON = 0.01;

export interface RefundableAllocation {
  paidAmount: number;
  priorRefundsTotal: number;
}

export function computeAllocationRefundableAmount(allocation: RefundableAllocation): number {
  return allocation.paidAmount - allocation.priorRefundsTotal;
}

/** Returns an error message if the amount isn't refundable against this allocation, or null if it's fine. */
export function validateRefundAmount(amount: number, refundableAmount: number): string | null {
  if (amount <= 0) return "Refund amount must be greater than zero.";
  if (amount > refundableAmount + REFUND_EPSILON) {
    return "Refund amount cannot exceed what was actually paid on this allocation.";
  }
  return null;
}
