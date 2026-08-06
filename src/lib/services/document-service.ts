import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { DocumentMetaInput } from "@/lib/validations/documents";
import type { OrgDocumentCategory, OrgDocumentEntityType } from "@/types/database.types";

export const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 5;

/** Builds the storage object path new uploads should target: org/category/uuid-filename. */
export function buildDocumentStoragePath(params: { organizationId: string; category: string; fileName: string }): string {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${params.organizationId}/${params.category}/${randomUUID()}-${safeName}`;
}

/** Issues a signed upload URL for the browser to PUT the file directly to Storage. */
export async function createSignedUploadUrl(path: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(ORGANIZATION_DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return data;
}

export interface ListDocumentsParams {
  organizationId: string;
  query?: string;
  category?: OrgDocumentCategory | "all";
  entityType?: OrgDocumentEntityType;
  entityId?: string;
  page?: number;
  pageSize?: number;
}

export async function listDocuments(params: ListDocumentsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("documents")
    .select("*, profiles:uploaded_by (first_name, last_name)", { count: "exact" })
    .eq("organization_id", params.organizationId)
    .eq("is_current", true)
    .order("created_at", { ascending: false });

  if (params.category && params.category !== "all") {
    queryBuilder = queryBuilder.eq("category", params.category);
  }
  if (params.query) {
    queryBuilder = queryBuilder.ilike("file_name", `%${params.query.trim()}%`);
  }
  if (params.entityType) {
    queryBuilder = queryBuilder.eq("entity_type", params.entityType);
  }
  if (params.entityId) {
    queryBuilder = queryBuilder.eq("entity_id", params.entityId);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { documents: data, total: count ?? 0, page, pageSize };
}

export async function createDocument(params: {
  organizationId: string;
  uploadedBy: string | null;
  input: DocumentMetaInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documents")
    .insert({
      organization_id: params.organizationId,
      file_name: params.input.fileName,
      file_path: params.input.filePath,
      file_size: params.input.fileSize,
      mime_type: params.input.mimeType,
      category: params.input.category,
      entity_type: params.input.entityType || null,
      entity_id: params.input.entityId || null,
      notes: params.input.notes || null,
      uploaded_by: params.uploadedBy,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.uploadedBy,
    action: "document.uploaded",
    entityType: "document",
    entityId: data.id,
    metadata: { fileName: params.input.fileName, category: params.input.category },
  });

  return data;
}

export async function createDocumentVersion(params: {
  organizationId: string;
  previousDocumentId: string;
  uploadedBy: string;
  input: DocumentMetaInput;
}) {
  const admin = createAdminClient();
  const { data: previous, error: fetchError } = await admin
    .from("documents")
    .select("*")
    .eq("id", params.previousDocumentId)
    .eq("organization_id", params.organizationId)
    .single();
  if (fetchError) throw fetchError;

  const { error: supersedeError } = await admin
    .from("documents")
    .update({ is_current: false })
    .eq("id", params.previousDocumentId);
  if (supersedeError) throw supersedeError;

  const { data, error } = await admin
    .from("documents")
    .insert({
      organization_id: params.organizationId,
      file_name: params.input.fileName,
      file_path: params.input.filePath,
      file_size: params.input.fileSize,
      mime_type: params.input.mimeType,
      category: previous.category,
      entity_type: previous.entity_type,
      entity_id: previous.entity_id,
      notes: params.input.notes || previous.notes,
      version: previous.version + 1,
      replaces_document_id: previous.id,
      uploaded_by: params.uploadedBy,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.uploadedBy,
    action: "document.new_version",
    entityType: "document",
    entityId: data.id,
    metadata: { fileName: params.input.fileName, version: data.version },
  });

  return data;
}

export async function getSignedDownloadUrl(filePath: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(params: {
  documentId: string;
  organizationId: string;
  actingUserId: string | null;
}) {
  const admin = createAdminClient();
  const { data: doc, error: fetchError } = await admin
    .from("documents")
    .select("id, file_path, file_name")
    .eq("id", params.documentId)
    .eq("organization_id", params.organizationId)
    .single();
  if (fetchError) throw fetchError;

  const { error: storageError } = await admin.storage.from(ORGANIZATION_DOCUMENTS_BUCKET).remove([doc.file_path]);
  if (storageError) throw storageError;

  const { error: deleteError } = await admin.from("documents").delete().eq("id", params.documentId);
  if (deleteError) throw deleteError;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "document.deleted",
    entityType: "document",
    entityId: params.documentId,
    metadata: { fileName: doc.file_name },
  });
}
