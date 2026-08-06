import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { recomputeClaimTotals } from "@/lib/services/claim-service";
import { getStripeClient } from "@/lib/stripe";
import { computeAllocationRefundableAmount, validateRefundAmount } from "@/lib/services/refund-logic";
import type { PaymentRefundInput } from "@/lib/validations/payment-refunds";

const REFUND_SELECT = "*, claim_lines:claim_line_id (line_number, procedure_code), profiles:created_by (first_name, last_name)";

export async function listRefundsForPayment(paymentId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_refunds")
    .select(REFUND_SELECT)
    .eq("payment_id", paymentId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Issues a refund against a specific payment allocation - the mirror image
 * of addPaymentAllocation(): decrement claim_lines.paid_amount instead of
 * incrementing it, then recomputeClaimTotals() so total_paid_amount and the
 * generated balance_amount column stay correct. For a patient-portal card
 * payment (payments.stripe_payment_intent_id is set), the money is actually
 * reversed via Stripe first - a manual/ERA payment has no external gateway
 * to call, so that step is skipped entirely.
 */
export async function createPaymentRefund(params: {
  paymentId: string;
  organizationId: string;
  actingUserId: string;
  input: PaymentRefundInput;
}) {
  const admin = createAdminClient();

  const { data: allocation, error: allocationError } = await admin
    .from("payment_allocations")
    .select("*, claim_lines:claim_line_id (id, claim_id, paid_amount)")
    .eq("id", params.input.paymentAllocationId)
    .eq("payment_id", params.paymentId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (allocationError) throw allocationError;
  if (!allocation) throw new Error("Allocation not found on this payment");

  const claimLine = allocation.claim_lines;
  if (!claimLine) throw new Error("Procedure line not found for this allocation");

  const { data: priorRefunds, error: priorError } = await admin
    .from("payment_refunds")
    .select("amount")
    .eq("payment_allocation_id", params.input.paymentAllocationId);
  if (priorError) throw priorError;
  const priorRefundsTotal = (priorRefunds ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  const refundable = computeAllocationRefundableAmount({
    paidAmount: Number(allocation.paid_amount),
    priorRefundsTotal,
  });
  const validationError = validateRefundAmount(params.input.amount, refundable);
  if (validationError) throw new Error(validationError);

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("id", params.paymentId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (paymentError) throw paymentError;

  // Reverse the charge first, before writing anything - if Stripe rejects
  // it, nothing should be recorded as if it succeeded.
  let stripeRefundId: string | null = null;
  if (payment?.stripe_payment_intent_id) {
    const stripe = getStripeClient();
    if (stripe) {
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: Math.round(params.input.amount * 100),
      });
      stripeRefundId = stripeRefund.id;
    }
  }

  const { data: refund, error: insertError } = await admin
    .from("payment_refunds")
    .insert({
      organization_id: params.organizationId,
      payment_id: params.paymentId,
      payment_allocation_id: params.input.paymentAllocationId,
      claim_id: claimLine.claim_id,
      claim_line_id: claimLine.id,
      amount: params.input.amount,
      reason: params.input.reason,
      notes: params.input.notes || null,
      stripe_refund_id: stripeRefundId,
      created_by: params.actingUserId,
    })
    .select(REFUND_SELECT)
    .single();
  if (insertError) throw insertError;

  const { error: updateLineError } = await admin
    .from("claim_lines")
    .update({ paid_amount: Math.max(0, Number(claimLine.paid_amount) - params.input.amount) })
    .eq("id", claimLine.id);
  if (updateLineError) throw updateLineError;

  await recomputeClaimTotals(claimLine.claim_id, params.organizationId);

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "payment.refund_issued",
    entityType: "payment",
    entityId: params.paymentId,
    metadata: {
      paymentAllocationId: params.input.paymentAllocationId,
      claimLineId: claimLine.id,
      amount: params.input.amount,
      reason: params.input.reason,
      stripeRefundId,
    },
  });

  return refund;
}
