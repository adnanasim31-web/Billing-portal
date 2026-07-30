import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { CredentialInput } from "@/lib/validations/credentialing";
import type { CredentialStatus } from "@/types/database.types";

const CREDENTIAL_SELECT =
  "*, providers:provider_id (id, first_name, last_name, organization_name, provider_type)";

export interface ListCredentialsParams {
  organizationId: string;
  query?: string;
  status?: CredentialStatus | "all";
  expiringSoon?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listCredentials(params: ListCredentialsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("provider_credentials")
    .select(CREDENTIAL_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("expiration_date", { ascending: true, nullsFirst: false });

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }
  if (params.expiringSoon) {
    const today = new Date();
    const warningDeadline = new Date(today);
    warningDeadline.setUTCDate(warningDeadline.getUTCDate() + 60);
    queryBuilder = queryBuilder
      .gte("expiration_date", today.toISOString().slice(0, 10))
      .lte("expiration_date", warningDeadline.toISOString().slice(0, 10));
  }
  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.or(`credential_number.ilike.%${term}%,issuing_authority.ilike.%${term}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { credentials: data, total: count ?? 0, page, pageSize };
}

export async function listCredentialsForProvider(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_credentials")
    .select("*")
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("expiration_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createCredential(params: {
  providerId: string;
  organizationId: string;
  actingUserId: string;
  input: CredentialInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_credentials")
    .insert({
      organization_id: params.organizationId,
      provider_id: params.providerId,
      credential_type: params.input.credentialType,
      credential_number: params.input.credentialNumber || null,
      issuing_authority: params.input.issuingAuthority || null,
      issue_date: params.input.issueDate || null,
      expiration_date: params.input.expirationDate || null,
      status: params.input.status,
      notes: params.input.notes || null,
      created_by: params.actingUserId,
      updated_by: params.actingUserId,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "credential.created",
    entityType: "provider_credential",
    entityId: data.id,
    metadata: { providerId: params.providerId, credentialType: params.input.credentialType },
  });

  return data;
}

export async function updateCredential(params: {
  credentialId: string;
  organizationId: string;
  actingUserId: string;
  input: CredentialInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_credentials")
    .update({
      credential_type: params.input.credentialType,
      credential_number: params.input.credentialNumber || null,
      issuing_authority: params.input.issuingAuthority || null,
      issue_date: params.input.issueDate || null,
      expiration_date: params.input.expirationDate || null,
      status: params.input.status,
      notes: params.input.notes || null,
      updated_by: params.actingUserId,
    })
    .eq("id", params.credentialId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "credential.updated",
    entityType: "provider_credential",
    entityId: params.credentialId,
  });

  return data;
}

export async function deleteCredential(params: { credentialId: string; organizationId: string; actingUserId: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("provider_credentials")
    .delete()
    .eq("id", params.credentialId)
    .eq("organization_id", params.organizationId);
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "credential.deleted",
    entityType: "provider_credential",
    entityId: params.credentialId,
  });
}
