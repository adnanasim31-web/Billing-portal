import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { computeCoverageStatus } from "@/lib/services/eligibility-coverage";
import type { EligibilityCheckInput } from "@/lib/validations/eligibility";
import type { EligibilityStatus } from "@/types/database.types";

const CHECK_SELECT =
  "*, patients:patient_id (id, mrn, first_name, last_name), providers:provider_id (id, first_name, last_name, organization_name, provider_type)";

async function resolvePolicy(params: { patientId: string; organizationId: string; policyId?: string }) {
  const admin = createAdminClient();
  let queryBuilder = admin
    .from("patient_insurance_policies")
    .select("*")
    .eq("patient_id", params.patientId)
    .eq("organization_id", params.organizationId);

  queryBuilder = params.policyId
    ? queryBuilder.eq("id", params.policyId)
    : queryBuilder.eq("is_active", true).order("rank").limit(1);

  const { data, error } = await queryBuilder.maybeSingle();
  if (error) throw error;
  return data;
}

export async function runEligibilityCheck(params: {
  organizationId: string;
  checkedBy: string;
  input: EligibilityCheckInput;
}) {
  const admin = createAdminClient();
  const policy = await resolvePolicy({
    patientId: params.input.patientId,
    organizationId: params.organizationId,
    policyId: params.input.patientInsurancePolicyId || undefined,
  });

  const today = new Date().toISOString().slice(0, 10);
  const { status, notes } = computeCoverageStatus(
    policy
      ? { isActive: policy.is_active, effectiveDate: policy.effective_date, terminationDate: policy.termination_date }
      : null,
    today
  );

  const { data, error } = await admin
    .from("eligibility_checks")
    .insert({
      organization_id: params.organizationId,
      patient_id: params.input.patientId,
      patient_insurance_policy_id: policy?.id ?? null,
      provider_id: params.input.providerId || null,
      service_type: params.input.serviceType,
      status,
      payer_name: policy?.payer_name ?? null,
      plan_name: policy?.plan_name ?? null,
      policy_number: policy?.policy_number ?? null,
      copay_amount: policy?.copay_amount ?? null,
      effective_date: policy?.effective_date ?? null,
      termination_date: policy?.termination_date ?? null,
      notes,
      checked_by: params.checkedBy,
    })
    .select(CHECK_SELECT)
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.checkedBy,
    action: "eligibility.checked",
    entityType: "eligibility_check",
    entityId: data.id,
    metadata: { patientId: params.input.patientId, status },
  });

  return data;
}

export interface ListEligibilityChecksParams {
  organizationId: string;
  query?: string;
  status?: EligibilityStatus | "all";
  page?: number;
  pageSize?: number;
}

export async function listEligibilityChecks(params: ListEligibilityChecksParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("eligibility_checks")
    .select(CHECK_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("checked_at", { ascending: false });

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }
  if (params.query) {
    queryBuilder = queryBuilder.or(
      `first_name.ilike.%${params.query.trim()}%,last_name.ilike.%${params.query.trim()}%`,
      { foreignTable: "patients" }
    );
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { checks: data, total: count ?? 0, page, pageSize };
}

export async function listEligibilityChecksForPatient(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("eligibility_checks")
    .select(CHECK_SELECT)
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("checked_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getEligibilityCheckById(checkId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("eligibility_checks")
    .select(CHECK_SELECT)
    .eq("id", checkId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
