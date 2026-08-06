import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { recomputeClaimTotals } from "@/lib/services/claim-service";
import { computeLineRemainingBalance, validateAdjustmentAmount } from "@/lib/services/claim-adjustment-logic";
import type { ClaimAdjustmentInput } from "@/lib/validations/claim-adjustments";

const ADJUSTMENT_SELECT =
  "*, claim_lines:claim_line_id (line_number, procedure_code), profiles:created_by (first_name, last_name)";

export async function listAdjustmentsForClaim(claimId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claim_adjustments")
    .select(ADJUSTMENT_SELECT)
    .eq("claim_id", claimId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Posts a manual adjustment (write-off, contractual, hardship, etc.)
 * against one procedure line - the same claim_lines.adjustment_amount +
 * recomputeClaimTotals() path payment allocations already use, just
 * without a payment attached. balance_amount is a generated column, so it
 * recomputes automatically the moment total_adjustment_amount changes -
 * no separate step needed to keep it in sync.
 */
export async function createClaimAdjustment(params: {
  claimId: string;
  organizationId: string;
  actingUserId: string;
  input: ClaimAdjustmentInput;
}) {
  const admin = createAdminClient();

  const { data: line, error: lineError } = await admin
    .from("claim_lines")
    .select("*")
    .eq("id", params.input.claimLineId)
    .eq("claim_id", params.claimId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (lineError) throw lineError;
  if (!line) throw new Error("Procedure line not found on this claim");

  const remaining = computeLineRemainingBalance({
    chargeAmount: Number(line.charge_amount),
    paidAmount: Number(line.paid_amount),
    adjustmentAmount: Number(line.adjustment_amount),
  });
  const validationError = validateAdjustmentAmount(params.input.amount, remaining);
  if (validationError) throw new Error(validationError);

  const { data: adjustment, error: insertError } = await admin
    .from("claim_adjustments")
    .insert({
      organization_id: params.organizationId,
      claim_id: params.claimId,
      claim_line_id: params.input.claimLineId,
      amount: params.input.amount,
      category: params.input.category,
      notes: params.input.notes || null,
      created_by: params.actingUserId,
    })
    .select(ADJUSTMENT_SELECT)
    .single();
  if (insertError) throw insertError;

  const { error: updateLineError } = await admin
    .from("claim_lines")
    .update({ adjustment_amount: Number(line.adjustment_amount) + params.input.amount })
    .eq("id", params.input.claimLineId);
  if (updateLineError) throw updateLineError;

  await recomputeClaimTotals(params.claimId, params.organizationId);

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "claim.adjustment_posted",
    entityType: "claim",
    entityId: params.claimId,
    metadata: {
      claimLineId: params.input.claimLineId,
      amount: params.input.amount,
      category: params.input.category,
    },
  });

  return adjustment;
}
