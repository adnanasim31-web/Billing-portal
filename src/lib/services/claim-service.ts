import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { scrubClaim, type ClaimScrubResult } from "@/lib/services/claim-scrubbing";
import type { ClaimInput, ClaimDiagnosisInput, ClaimLineInput, ClaimStatusChangeInput } from "@/lib/validations/claims";
import type { ClaimStatus, Database } from "@/types/database.types";

const CLAIM_SELECT =
  "*, patients:patient_id (id, mrn, first_name, last_name), providers:provider_id (id, first_name, last_name, organization_name, provider_type), insurance_companies:payer_company_id (id, name, payer_id_code), patient_insurance_policies:patient_insurance_policy_id (id, policy_number, rank)";

/** Generates the next sequential claim number for an org, e.g. "CLM-000001", retrying on collision. */
async function generateNextClaimNumber(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const nextNumber = (count ?? 0) + 1;
  return `CLM-${String(nextNumber).padStart(6, "0")}`;
}

const EDITABLE_STATUSES: ClaimStatus[] = ["draft", "ready"];

function assertShellEditable(status: ClaimStatus) {
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new Error("This claim has already been submitted and its details can no longer be edited.");
  }
}

export interface ListClaimsParams {
  organizationId: string;
  query?: string;
  status?: ClaimStatus | "all";
  providerId?: string;
  page?: number;
  pageSize?: number;
}

export async function listClaims(params: ListClaimsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("claims")
    .select(CLAIM_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }
  if (params.providerId) {
    queryBuilder = queryBuilder.eq("provider_id", params.providerId);
  }
  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.ilike("claim_number", `%${term}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { claims: data, total: count ?? 0, page, pageSize };
}

export async function listClaimsForPatient(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select(CLAIM_SELECT)
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listClaimsForProvider(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select(CLAIM_SELECT)
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClaimById(claimId: string, organizationId: string) {
  const admin = createAdminClient();

  const { data: claim, error: claimError } = await admin
    .from("claims")
    .select(CLAIM_SELECT)
    .eq("id", claimId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claim) return null;

  const [{ data: diagnoses, error: dxError }, { data: lines, error: lineError }, { data: history, error: historyError }] =
    await Promise.all([
      admin
        .from("claim_diagnoses")
        .select("*, icd10_codes:icd10_code (code, description)")
        .eq("claim_id", claimId)
        .order("sequence"),
      admin
        .from("claim_lines")
        .select("*, procedure_codes:procedure_code (code, description)")
        .eq("claim_id", claimId)
        .order("line_number"),
      admin
        .from("claim_status_history")
        .select("*, profiles:changed_by (first_name, last_name)")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false }),
    ]);
  if (dxError) throw dxError;
  if (lineError) throw lineError;
  if (historyError) throw historyError;

  return { claim, diagnoses: diagnoses ?? [], lines: lines ?? [], history: history ?? [] };
}

export async function scrubClaimById(claimId: string, organizationId: string): Promise<ClaimScrubResult> {
  const detail = await getClaimById(claimId, organizationId);
  if (!detail) throw new Error("Claim not found");

  return scrubClaim(
    {
      payerCompanyId: detail.claim.payer_company_id,
      serviceDateFrom: detail.claim.service_date_from,
      serviceDateTo: detail.claim.service_date_to,
    },
    detail.diagnoses.map((d) => ({ sequence: d.sequence, icd10Code: d.icd10_code })),
    detail.lines.map((l) => ({
      lineNumber: l.line_number,
      procedureCode: l.procedure_code,
      modifier1: l.modifier_1,
      modifier2: l.modifier_2,
      diagnosisPointers: l.diagnosis_pointers ?? [],
      units: l.units,
      chargeAmount: Number(l.charge_amount),
    }))
  );
}

export async function createClaim(params: { organizationId: string; createdBy: string; input: ClaimInput }) {
  const admin = createAdminClient();
  const claimNumber = await generateNextClaimNumber(params.organizationId);

  const { data, error } = await admin
    .from("claims")
    .insert({
      organization_id: params.organizationId,
      claim_number: claimNumber,
      patient_id: params.input.patientId,
      provider_id: params.input.providerId,
      payer_company_id: params.input.payerCompanyId || null,
      patient_insurance_policy_id: params.input.patientInsurancePolicyId || null,
      service_date_from: params.input.serviceDateFrom,
      service_date_to: params.input.serviceDateTo,
      place_of_service: params.input.placeOfService || null,
      notes: params.input.notes || null,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  await admin.from("claim_status_history").insert({
    claim_id: data.id,
    organization_id: params.organizationId,
    from_status: null,
    to_status: "draft",
    changed_by: params.createdBy,
  });

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.createdBy,
    action: "claim.created",
    entityType: "claim",
    entityId: data.id,
    metadata: { claimNumber },
  });

  return data;
}

export async function updateClaim(params: {
  claimId: string;
  organizationId: string;
  updatedBy: string;
  input: ClaimInput;
}) {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("claims")
    .select("status")
    .eq("id", params.claimId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Claim not found");
  assertShellEditable(existing.status);

  const { data, error } = await admin
    .from("claims")
    .update({
      patient_id: params.input.patientId,
      provider_id: params.input.providerId,
      payer_company_id: params.input.payerCompanyId || null,
      patient_insurance_policy_id: params.input.patientInsurancePolicyId || null,
      service_date_from: params.input.serviceDateFrom,
      service_date_to: params.input.serviceDateTo,
      place_of_service: params.input.placeOfService || null,
      notes: params.input.notes || null,
      updated_by: params.updatedBy,
    })
    .eq("id", params.claimId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.updatedBy,
    action: "claim.updated",
    entityType: "claim",
    entityId: params.claimId,
  });

  return data;
}

async function recomputeClaimTotals(claimId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data: lines, error } = await admin
    .from("claim_lines")
    .select("charge_amount, paid_amount, adjustment_amount")
    .eq("claim_id", claimId);
  if (error) throw error;

  const totals = (lines ?? []).reduce(
    (acc, line) => ({
      charge: acc.charge + Number(line.charge_amount),
      paid: acc.paid + Number(line.paid_amount),
      adjustment: acc.adjustment + Number(line.adjustment_amount),
    }),
    { charge: 0, paid: 0, adjustment: 0 }
  );

  const { error: updateError } = await admin
    .from("claims")
    .update({
      total_charge_amount: totals.charge,
      total_paid_amount: totals.paid,
      total_adjustment_amount: totals.adjustment,
    })
    .eq("id", claimId)
    .eq("organization_id", organizationId);
  if (updateError) throw updateError;
}

async function getClaimStatusOrThrow(claimId: string, organizationId: string): Promise<ClaimStatus> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select("status")
    .eq("id", claimId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Claim not found");
  return data.status;
}

export async function addClaimDiagnosis(params: {
  claimId: string;
  organizationId: string;
  input: ClaimDiagnosisInput;
}) {
  const admin = createAdminClient();
  assertShellEditable(await getClaimStatusOrThrow(params.claimId, params.organizationId));

  const { data, error } = await admin
    .from("claim_diagnoses")
    .insert({
      claim_id: params.claimId,
      organization_id: params.organizationId,
      sequence: params.input.sequence,
      icd10_code: params.input.icd10Code,
    })
    .select("*, icd10_codes:icd10_code (code, description)")
    .single();
  if (error) throw error;
  return data;
}

export async function removeClaimDiagnosis(params: { diagnosisId: string; claimId: string; organizationId: string }) {
  const admin = createAdminClient();
  assertShellEditable(await getClaimStatusOrThrow(params.claimId, params.organizationId));

  const { error } = await admin
    .from("claim_diagnoses")
    .delete()
    .eq("id", params.diagnosisId)
    .eq("claim_id", params.claimId)
    .eq("organization_id", params.organizationId);
  if (error) throw error;
}

export async function addClaimLine(params: { claimId: string; organizationId: string; input: ClaimLineInput }) {
  const admin = createAdminClient();
  assertShellEditable(await getClaimStatusOrThrow(params.claimId, params.organizationId));

  const { data, error } = await admin
    .from("claim_lines")
    .insert({
      claim_id: params.claimId,
      organization_id: params.organizationId,
      line_number: params.input.lineNumber,
      procedure_code: params.input.procedureCode,
      modifier_1: params.input.modifier1 || null,
      modifier_2: params.input.modifier2 || null,
      diagnosis_pointers: params.input.diagnosisPointers,
      units: params.input.units,
      charge_amount: params.input.chargeAmount,
    })
    .select("*, procedure_codes:procedure_code (code, description)")
    .single();
  if (error) throw error;

  await recomputeClaimTotals(params.claimId, params.organizationId);
  return data;
}

export async function removeClaimLine(params: { lineId: string; claimId: string; organizationId: string }) {
  const admin = createAdminClient();
  assertShellEditable(await getClaimStatusOrThrow(params.claimId, params.organizationId));

  const { error } = await admin
    .from("claim_lines")
    .delete()
    .eq("id", params.lineId)
    .eq("claim_id", params.claimId)
    .eq("organization_id", params.organizationId);
  if (error) throw error;

  await recomputeClaimTotals(params.claimId, params.organizationId);
}

export async function changeClaimStatus(params: {
  claimId: string;
  organizationId: string;
  actingUserId: string;
  input: ClaimStatusChangeInput;
}) {
  const admin = createAdminClient();
  const fromStatus = await getClaimStatusOrThrow(params.claimId, params.organizationId);
  const now = new Date().toISOString();

  const patch: Database["public"]["Tables"]["claims"]["Update"] = {
    status: params.input.status,
    updated_by: params.actingUserId,
  };
  if (params.input.status === "submitted") patch.submitted_at = now;
  if (params.input.status === "accepted") patch.accepted_at = now;
  if (params.input.status === "rejected") {
    patch.rejected_at = now;
    patch.rejection_reason = params.input.note || null;
  }
  if (params.input.status === "appealed") {
    patch.appealed_at = now;
    patch.appeal_notes = params.input.note || null;
  }

  const { data, error } = await admin
    .from("claims")
    .update(patch)
    .eq("id", params.claimId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  await admin.from("claim_status_history").insert({
    claim_id: params.claimId,
    organization_id: params.organizationId,
    from_status: fromStatus,
    to_status: params.input.status,
    note: params.input.note || null,
    changed_by: params.actingUserId,
  });

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "claim.status_changed",
    entityType: "claim",
    entityId: params.claimId,
    metadata: { fromStatus, toStatus: params.input.status },
  });

  return data;
}
