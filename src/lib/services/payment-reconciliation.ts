/**
 * Pure reconciliation-threshold logic - no DB access, so it's cheap to unit
 * test. payment-service.ts calls this after recomputing a claim's totals to
 * decide whether to auto-transition the claim to 'paid'.
 */
const RECONCILIATION_EPSILON = 0.01;

export interface ClaimTotalsSnapshot {
  totalChargeAmount: number;
  totalPaidAmount: number;
  totalAdjustmentAmount: number;
}

export function isClaimFullyReconciled(totals: ClaimTotalsSnapshot): boolean {
  return totals.totalPaidAmount + totals.totalAdjustmentAmount >= totals.totalChargeAmount - RECONCILIATION_EPSILON;
}
