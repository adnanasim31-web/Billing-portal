import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { PatientDocumentMetaInput } from "@/lib/validations/patients";

export const PATIENT_DOCUMENTS_BUCKET = "patient-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 5;

/** Builds the storage object path new uploads should target: org/patient/uuid-filename. */
export function buildDocumentStoragePath(params: {
  organizationId: string;
  patientId: string;
  fileName: string;
}): string {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${params.organizationId}/${params.patientId}/${randomUUID()}-${safeName}`;
}

/**
 * Issues a signed upload URL for the browser to PUT the file directly to
 * Storage - file bytes never pass through the Next.js server.
 */
export async function createSignedUploadUrl(path: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path);

  if (error) throw error;
  return data;
}

export async function listPatientDocuments(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_documents")
    .select("*")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function recordPatientDocument(params: {
  patientId: string;
  organizationId: string;
  uploadedBy: string | null;
  input: PatientDocumentMetaInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_documents")
    .insert({
      patient_id: params.patientId,
      organization_id: params.organizationId,
      file_name: params.input.fileName,
      file_path: params.input.filePath,
      file_size: params.input.fileSize,
      mime_type: params.input.mimeType,
      category: params.input.category,
      uploaded_by: params.uploadedBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.uploadedBy,
    action: "patient.document_uploaded",
    entityType: "patient",
    entityId: params.patientId,
    metadata: { fileName: params.input.fileName, category: params.input.category },
  });

  return data;
}

export async function getSignedDownloadUrl(filePath: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function deletePatientDocument(params: {
  documentId: string;
  organizationId: string;
  actingUserId: string;
}) {
  const admin = createAdminClient();
  const { data: doc, error: fetchError } = await admin
    .from("patient_documents")
    .select("id, patient_id, file_path, file_name")
    .eq("id", params.documentId)
    .eq("organization_id", params.organizationId)
    .single();

  if (fetchError) throw fetchError;

  const { error: storageError } = await admin.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .remove([doc.file_path]);
  if (storageError) throw storageError;

  const { error: deleteError } = await admin
    .from("patient_documents")
    .delete()
    .eq("id", params.documentId);
  if (deleteError) throw deleteError;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "patient.document_deleted",
    entityType: "patient",
    entityId: doc.patient_id,
    metadata: { fileName: doc.file_name },
  });
}
