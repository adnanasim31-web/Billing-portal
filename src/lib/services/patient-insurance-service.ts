import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { PatientInsuranceInput } from "@/lib/validations/patients";

export async function listPatientInsurance(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_insurance_policies")
    .select("*")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("rank")
    .order("is_active", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPatientInsurance(params: {
  patientId: string;
  organizationId: string;
  actingUserId: string;
  input: PatientInsuranceInput;
}) {
  const admin = createAdminClient();

  // A patient may have only one *active* policy per rank - deactivate any
  // existing active policy of the same rank before inserting the new one,
  // so the new coverage supersedes it instead of colliding with the
  // partial unique index.
  if (params.input.isActive) {
    await admin
      .from("patient_insurance_policies")
      .update({ is_active: false })
      .eq("patient_id", params.patientId)
      .eq("rank", params.input.rank)
      .eq("is_active", true);
  }

  const { data, error } = await admin
    .from("patient_insurance_policies")
    .insert({
      patient_id: params.patientId,
      organization_id: params.organizationId,
      rank: params.input.rank,
      payer_company_id: params.input.payerCompanyId || null,
      payer_name: params.input.payerName,
      payer_id_code: params.input.payerIdCode || null,
      plan_name: params.input.planName || null,
      policy_number: params.input.policyNumber,
      group_number: params.input.groupNumber || null,
      subscriber_name: params.input.subscriberName,
      subscriber_dob: params.input.subscriberDob || null,
      subscriber_relationship: params.input.subscriberRelationship,
      effective_date: params.input.effectiveDate || null,
      termination_date: params.input.terminationDate || null,
      copay_amount: params.input.copayAmount ?? null,
      is_active: params.input.isActive,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "patient.insurance_added",
    entityType: "patient",
    entityId: params.patientId,
    metadata: { rank: params.input.rank, payerName: params.input.payerName },
  });

  return data;
}

export async function deactivatePatientInsurance(params: {
  policyId: string;
  organizationId: string;
  actingUserId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("patient_insurance_policies")
    .update({ is_active: false })
    .eq("id", params.policyId)
    .eq("organization_id", params.organizationId);

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "patient.insurance_deactivated",
    entityType: "patient_insurance_policy",
    entityId: params.policyId,
  });
}
