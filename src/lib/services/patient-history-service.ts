import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { PatientHistoryEntryInput } from "@/lib/validations/patients";

export async function listPatientHistory(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_medical_history")
    .select("*")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function addPatientHistoryEntry(params: {
  patientId: string;
  organizationId: string;
  recordedBy: string;
  input: PatientHistoryEntryInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_medical_history")
    .insert({
      patient_id: params.patientId,
      organization_id: params.organizationId,
      entry_type: params.input.entryType,
      description: params.input.description,
      onset_date: params.input.onsetDate || null,
      status: params.input.status,
      recorded_by: params.recordedBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.recordedBy,
    action: "patient.history_added",
    entityType: "patient",
    entityId: params.patientId,
    metadata: { entryType: params.input.entryType },
  });

  return data;
}

export async function deletePatientHistoryEntry(params: {
  entryId: string;
  organizationId: string;
  actingUserId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("patient_medical_history")
    .delete()
    .eq("id", params.entryId)
    .eq("organization_id", params.organizationId);

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "patient.history_deleted",
    entityType: "patient_medical_history",
    entityId: params.entryId,
  });
}
