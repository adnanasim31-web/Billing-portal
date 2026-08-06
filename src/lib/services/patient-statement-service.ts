import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPatientById } from "@/lib/services/patient-service";
import { listClaimsForPatient } from "@/lib/services/claim-service";

const STATEMENT_ORGANIZATION_SELECT =
  "name, phone, billing_email, address_line1, address_line2, city, state, postal_code";

export async function getPatientStatementData(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const [patient, claims, orgResult] = await Promise.all([
    getPatientById(patientId, organizationId),
    listClaimsForPatient(patientId, organizationId),
    admin.from("organizations").select(STATEMENT_ORGANIZATION_SELECT).eq("id", organizationId).maybeSingle(),
  ]);
  if (orgResult.error) throw orgResult.error;

  return { patient, claims, organization: orgResult.data };
}

export interface StatementClaimSummary {
  totalChargeAmount: number;
  totalPaidAmount: number;
  totalAdjustmentAmount: number;
  balanceAmount: number;
}

/**
 * Pure so it's cheap to unit test - mirrors the same reduce-over-claims
 * shape used by ar-service.ts's aging totals, just for the full statement
 * (charged/paid/adjusted/balance) rather than only the outstanding balance.
 */
export function computeStatementTotals(claims: StatementClaimSummary[]) {
  return claims.reduce(
    (totals, claim) => ({
      totalCharged: totals.totalCharged + claim.totalChargeAmount,
      totalPaid: totals.totalPaid + claim.totalPaidAmount,
      totalAdjusted: totals.totalAdjusted + claim.totalAdjustmentAmount,
      totalBalance: totals.totalBalance + claim.balanceAmount,
    }),
    { totalCharged: 0, totalPaid: 0, totalAdjusted: 0, totalBalance: 0 }
  );
}
