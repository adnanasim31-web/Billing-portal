import "server-only";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { recomputeClaimTotals } from "@/lib/services/claim-service";

const PORTAL_PAYER_LABEL = "Patient (self-pay, card)";
const PORTAL_PAYMENT_NOTE = "Paid via the patient portal by card.";

export interface PortalUser {
  id: string;
  email: string;
  patientId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
}

/** Resolves the signed-in patient portal account, or null if this session isn't one. */
export async function getCurrentPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("patient_portal_accounts")
    .select("*, patients:patient_id (id, first_name, last_name)")
    .eq("id", user.id)
    .maybeSingle();
  if (!account || !account.patients) return null;

  return {
    id: account.id,
    email: account.email,
    patientId: account.patient_id,
    organizationId: account.organization_id,
    firstName: account.patients.first_name,
    lastName: account.patients.last_name,
  };
}

export async function markPortalLogin(accountId: string) {
  const admin = createAdminClient();
  await admin
    .from("patient_portal_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", accountId);
}

export async function getPortalAccountStatus(patientId: string, organizationId: string) {
  const admin = createAdminClient();

  const { data: account, error: accountError } = await admin
    .from("patient_portal_accounts")
    .select("email, last_login_at, created_at")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (accountError) throw accountError;
  if (account) return { state: "active" as const, ...account };

  const { data: invitation, error: inviteError } = await admin
    .from("patient_portal_invitations")
    .select("email, expires_at, created_at")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (inviteError) throw inviteError;
  if (invitation) return { state: "pending" as const, ...invitation };

  return { state: "none" as const };
}

export async function invitePatientToPortal(params: {
  patientId: string;
  organizationId: string;
  invitedBy: string;
}) {
  const admin = createAdminClient();

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .select("id, email")
    .eq("id", params.patientId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (patientError) throw patientError;
  if (!patient) throw new Error("Patient not found");
  if (!patient.email) throw new Error("This patient has no email on file - add one before inviting them.");

  const { data: existingAccount } = await admin
    .from("patient_portal_accounts")
    .select("id")
    .eq("patient_id", params.patientId)
    .maybeSingle();
  if (existingAccount) throw new Error("This patient already has portal access.");

  await admin
    .from("patient_portal_invitations")
    .update({ status: "expired" })
    .eq("patient_id", params.patientId)
    .eq("status", "pending");

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data: invitation, error } = await admin
    .from("patient_portal_invitations")
    .insert({
      organization_id: params.organizationId,
      patient_id: params.patientId,
      email: patient.email,
      token_hash: tokenHash,
      invited_by: params.invitedBy,
    })
    .select("id")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.invitedBy,
    action: "patient_portal.invited",
    entityType: "patient",
    entityId: params.patientId,
  });

  return { invitationId: invitation.id, rawToken, email: patient.email };
}

export async function acceptPatientPortalInvite(params: { token: string; password: string }) {
  const admin = createAdminClient();
  const tokenHash = createHash("sha256").update(params.token).digest("hex");

  const { data: invitation, error: inviteError } = await admin
    .from("patient_portal_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();
  if (inviteError) throw inviteError;
  if (!invitation) throw new Error("This invitation link is invalid or has expired.");

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await admin.from("patient_portal_invitations").update({ status: "expired" }).eq("id", invitation.id);
    throw new Error("This invitation has expired.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { patient_portal: true, patient_id: invitation.patient_id },
  });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Unable to create your account");
  }

  const { error: accountError } = await admin.from("patient_portal_accounts").insert({
    id: created.user.id,
    organization_id: invitation.organization_id,
    patient_id: invitation.patient_id,
    email: invitation.email,
    invited_by: invitation.invited_by,
  });
  if (accountError) throw accountError;

  await admin
    .from("patient_portal_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  await recordAuditLog({
    organizationId: invitation.organization_id,
    userId: created.user.id,
    action: "patient_portal.activated",
    entityType: "patient",
    entityId: invitation.patient_id,
  });
}

const PORTAL_CLAIM_SELECT =
  "id, claim_number, status, service_date_from, service_date_to, total_charge_amount, total_paid_amount, total_adjustment_amount, balance_amount, submitted_at";

export async function getPortalOverview(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data: claims, error } = await admin
    .from("claims")
    .select(PORTAL_CLAIM_SELECT)
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .not("status", "in", "(draft,ready)")
    .order("service_date_from", { ascending: false });
  if (error) throw error;

  const totalBalance = (claims ?? []).reduce((sum, c) => sum + Math.max(0, Number(c.balance_amount)), 0);
  return { claims: claims ?? [], totalBalance };
}

export async function getPortalClaimById(claimId: string, patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data: claim, error } = await admin
    .from("claims")
    .select(`${PORTAL_CLAIM_SELECT}, providers:provider_id (first_name, last_name, organization_name, provider_type)`)
    .eq("id", claimId)
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!claim) return null;

  const { data: lines, error: linesError } = await admin
    .from("claim_lines")
    .select("id, line_number, charge_amount, paid_amount, adjustment_amount, procedure_codes:procedure_code (code, description)")
    .eq("claim_id", claimId)
    .order("line_number");
  if (linesError) throw linesError;

  const { data: payments, error: paymentsError } = await admin
    .from("payments")
    .select("id, payer_name, payment_date, total_amount, payment_method")
    .eq("claim_id", claimId)
    .order("payment_date", { ascending: false });
  if (paymentsError) throw paymentsError;

  return { claim, lines: lines ?? [], payments: payments ?? [] };
}

/**
 * Called from the Stripe webhook once a card charge has actually succeeded -
 * pays down the claim's lines in order until the amount is exhausted.
 * Idempotent on stripePaymentIntentId since Stripe may redeliver the same
 * webhook event more than once.
 */
export async function recordPortalPayment(params: {
  claimId: string;
  patientId: string;
  organizationId: string;
  amount: number;
  stripePaymentIntentId: string;
}) {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("payments")
    .select("*")
    .eq("stripe_payment_intent_id", params.stripePaymentIntentId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: claim, error: claimError } = await admin
    .from("claims")
    .select("id, balance_amount")
    .eq("id", params.claimId)
    .eq("patient_id", params.patientId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claim) throw new Error("Claim not found");

  const { data: lines, error: linesError } = await admin
    .from("claim_lines")
    .select("id, charge_amount, paid_amount, adjustment_amount")
    .eq("claim_id", params.claimId)
    .order("line_number");
  if (linesError) throw linesError;

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      organization_id: params.organizationId,
      claim_id: params.claimId,
      payer_name: PORTAL_PAYER_LABEL,
      payment_method: "credit_card",
      payment_date: new Date().toISOString().slice(0, 10),
      total_amount: params.amount,
      notes: PORTAL_PAYMENT_NOTE,
      stripe_payment_intent_id: params.stripePaymentIntentId,
    })
    .select("*")
    .single();
  if (paymentError) throw paymentError;

  let remaining = params.amount;
  for (const line of lines ?? []) {
    if (remaining <= 0) break;
    const lineBalance = Number(line.charge_amount) - Number(line.paid_amount) - Number(line.adjustment_amount);
    if (lineBalance <= 0) continue;
    const allocation = Math.min(lineBalance, remaining);

    const { error: allocationError } = await admin.from("payment_allocations").insert({
      payment_id: payment.id,
      claim_line_id: line.id,
      organization_id: params.organizationId,
      paid_amount: allocation,
      adjustment_amount: 0,
    });
    if (allocationError) throw allocationError;

    const { error: lineUpdateError } = await admin
      .from("claim_lines")
      .update({ paid_amount: Number(line.paid_amount) + allocation })
      .eq("id", line.id);
    if (lineUpdateError) throw lineUpdateError;

    remaining -= allocation;
  }

  if (remaining > 0) {
    // Shouldn't happen - the API route validates amount <= balance before creating the
    // PaymentIntent - but the balance could have shifted between then and now. The
    // card was already charged either way, so log it rather than losing the payment.
    console.error("[patient-portal] payment amount exceeded allocatable line balance", {
      claimId: params.claimId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      unallocatedAmount: remaining,
    });
  }

  await recomputeClaimTotals(params.claimId, params.organizationId);

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: null,
    action: "patient_portal.payment_recorded",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      claimId: params.claimId,
      patientId: params.patientId,
      amount: params.amount,
      stripePaymentIntentId: params.stripePaymentIntentId,
    },
  });

  return payment;
}
