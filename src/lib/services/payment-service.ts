import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { changeClaimStatus, recomputeClaimTotals } from "@/lib/services/claim-service";
import { getPatientById } from "@/lib/services/patient-service";
import { isClaimFullyReconciled } from "@/lib/services/payment-reconciliation";
import type { PaymentInput, PaymentAllocationInput } from "@/lib/validations/payments";
import type { PaymentMethod } from "@/types/database.types";

const AUTO_PAID_ELIGIBLE_STATUSES = ["accepted", "appealed"];

export async function createPayment(params: { organizationId: string; postedBy: string; input: PaymentInput }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .insert({
      organization_id: params.organizationId,
      claim_id: params.input.claimId,
      payer_name: params.input.payerName,
      payment_method: params.input.paymentMethod,
      payment_date: params.input.paymentDate,
      reference_number: params.input.referenceNumber || null,
      total_amount: params.input.totalAmount,
      notes: params.input.notes || null,
      posted_by: params.postedBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.postedBy,
    action: "payment.created",
    entityType: "payment",
    entityId: data.id,
    metadata: { claimId: params.input.claimId, totalAmount: params.input.totalAmount },
  });

  return data;
}

export interface ListPaymentsParams {
  organizationId: string;
  query?: string;
  method?: PaymentMethod | "all";
  page?: number;
  pageSize?: number;
}

export async function listPayments(params: ListPaymentsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("payments")
    .select("*, claims:claim_id (id, claim_number, status)", { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("payment_date", { ascending: false });

  if (params.method && params.method !== "all") {
    queryBuilder = queryBuilder.eq("payment_method", params.method);
  }
  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.or(`payer_name.ilike.%${term}%,reference_number.ilike.%${term}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { payments: data, total: count ?? 0, page, pageSize };
}

export async function listPaymentsForClaim(claimId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("*")
    .eq("claim_id", claimId)
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPaymentById(paymentId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("*, claims:claim_id (id, claim_number, status, patient_id)")
    .eq("id", paymentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!payment || !payment.claims) return null;

  const [{ data: lines, error: lineError }, { data: allocations, error: allocError }, patient] = await Promise.all([
    admin
      .from("claim_lines")
      .select("*, procedure_codes:procedure_code (code, description)")
      .eq("claim_id", payment.claims.id)
      .order("line_number"),
    admin
      .from("payment_allocations")
      .select("*, claim_lines:claim_line_id (line_number, procedure_code)")
      .eq("payment_id", paymentId)
      .order("created_at"),
    getPatientById(payment.claims.patient_id, organizationId),
  ]);
  if (lineError) throw lineError;
  if (allocError) throw allocError;

  return { payment, lines: lines ?? [], allocations: allocations ?? [], patient };
}

export async function addPaymentAllocation(params: {
  paymentId: string;
  organizationId: string;
  actingUserId: string;
  input: PaymentAllocationInput;
}) {
  const admin = createAdminClient();

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("claim_id")
    .eq("id", params.paymentId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) throw new Error("Payment not found");

  const { data: line, error: lineError } = await admin
    .from("claim_lines")
    .select("*")
    .eq("id", params.input.claimLineId)
    .eq("claim_id", payment.claim_id)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (lineError) throw lineError;
  if (!line) throw new Error("Procedure line not found on this claim");

  const { data: allocation, error: insertError } = await admin
    .from("payment_allocations")
    .insert({
      payment_id: params.paymentId,
      claim_line_id: params.input.claimLineId,
      organization_id: params.organizationId,
      paid_amount: params.input.paidAmount,
      adjustment_amount: params.input.adjustmentAmount,
      adjustment_reason: params.input.adjustmentReason || null,
    })
    .select("*, claim_lines:claim_line_id (line_number, procedure_code)")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("This payment already has an allocation for that procedure line");
    }
    throw insertError;
  }

  const { error: updateLineError } = await admin
    .from("claim_lines")
    .update({
      paid_amount: Number(line.paid_amount) + params.input.paidAmount,
      adjustment_amount: Number(line.adjustment_amount) + params.input.adjustmentAmount,
    })
    .eq("id", params.input.claimLineId);
  if (updateLineError) throw updateLineError;

  await recomputeClaimTotals(payment.claim_id, params.organizationId);

  const { data: claim, error: claimError } = await admin
    .from("claims")
    .select("status, total_charge_amount, total_paid_amount, total_adjustment_amount")
    .eq("id", payment.claim_id)
    .maybeSingle();
  if (claimError) throw claimError;

  if (
    claim &&
    AUTO_PAID_ELIGIBLE_STATUSES.includes(claim.status) &&
    isClaimFullyReconciled({
      totalChargeAmount: Number(claim.total_charge_amount),
      totalPaidAmount: Number(claim.total_paid_amount),
      totalAdjustmentAmount: Number(claim.total_adjustment_amount),
    })
  ) {
    await changeClaimStatus({
      claimId: payment.claim_id,
      organizationId: params.organizationId,
      actingUserId: params.actingUserId,
      input: { status: "paid", note: "Auto-marked paid: fully reconciled by payment posting." },
    });
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "payment.allocated",
    entityType: "payment",
    entityId: params.paymentId,
    metadata: { claimLineId: params.input.claimLineId, paidAmount: params.input.paidAmount },
  });

  return allocation;
}
