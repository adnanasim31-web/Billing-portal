import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { PatientNoteInput } from "@/lib/validations/patients";

export async function listPatientNotes(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_notes")
    .select("*, profiles:author_id (first_name, last_name)")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function addPatientNote(params: {
  patientId: string;
  organizationId: string;
  authorId: string;
  input: PatientNoteInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_notes")
    .insert({
      patient_id: params.patientId,
      organization_id: params.organizationId,
      author_id: params.authorId,
      note_type: params.input.noteType,
      body: params.input.body,
      is_pinned: params.input.isPinned,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.authorId,
    action: "patient.note_added",
    entityType: "patient",
    entityId: params.patientId,
    metadata: { noteType: params.input.noteType },
  });

  return data;
}

export async function togglePatientNotePin(params: {
  noteId: string;
  organizationId: string;
  isPinned: boolean;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("patient_notes")
    .update({ is_pinned: params.isPinned })
    .eq("id", params.noteId)
    .eq("organization_id", params.organizationId);

  if (error) throw error;
}

export async function deletePatientNote(params: {
  noteId: string;
  organizationId: string;
  actingUserId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("patient_notes")
    .delete()
    .eq("id", params.noteId)
    .eq("organization_id", params.organizationId);

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "patient.note_deleted",
    entityType: "patient_notes",
    entityId: params.noteId,
  });
}
