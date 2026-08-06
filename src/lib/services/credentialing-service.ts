import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { isExpiringSoon } from "@/lib/services/credentialing-status";
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

  const { data: existing, error: fetchError } = await admin
    .from("provider_credentials")
    .select("expiration_date")
    .eq("id", params.credentialId)
    .eq("organization_id", params.organizationId)
    .single();
  if (fetchError) throw fetchError;

  const nextExpirationDate = params.input.expirationDate || null;
  const expirationChanged = nextExpirationDate !== existing.expiration_date;

  const { data, error } = await admin
    .from("provider_credentials")
    .update({
      credential_type: params.input.credentialType,
      credential_number: params.input.credentialNumber || null,
      issuing_authority: params.input.issuingAuthority || null,
      issue_date: params.input.issueDate || null,
      expiration_date: nextExpirationDate,
      status: params.input.status,
      notes: params.input.notes || null,
      updated_by: params.actingUserId,
      // A renewal (new expiration_date) re-arms the expiring-soon reminder
      // email for the new date - otherwise it would stay silenced from the
      // last notice sent for the old date.
      ...(expirationChanged ? { expiration_notified_at: null } : {}),
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

// Matches CREDENTIALS_EXPIRING_SOON_DAYS in provider-portal-service.ts - the
// overview page's "credentials expiring soon" count and this reminder email
// should agree on what "soon" means, otherwise a provider who sees "2
// expiring" on their dashboard but never got an email (or vice versa) would
// reasonably read that as a bug.
const CREDENTIAL_EXPIRATION_NOTICE_WINDOW_DAYS = 30;

const CREDENTIAL_NOTICE_SELECT =
  "id, provider_id, organization_id, credential_type, expiration_date, providers:provider_id (provider_type, first_name, last_name, organization_name, credential_suffix)";

/**
 * Global sweep for the daily expiring-credentials cron - not scoped to a
 * single organization since the cron job itself has no org context. Only
 * returns credentials never notified for their *current* expiration_date;
 * updateCredential() resets expiration_notified_at on a renewal so this
 * fires again for the new date.
 */
export async function listCredentialsNeedingExpirationNotice() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("provider_credentials")
    .select(CREDENTIAL_NOTICE_SELECT)
    .not("expiration_date", "is", null)
    .is("expiration_notified_at", null);
  if (error) throw error;

  return (data ?? []).filter((row) =>
    isExpiringSoon(row.expiration_date, today, CREDENTIAL_EXPIRATION_NOTICE_WINDOW_DAYS)
  );
}

export async function markCredentialsNotified(credentialIds: string[]) {
  if (credentialIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("provider_credentials")
    .update({ expiration_notified_at: new Date().toISOString() })
    .in("id", credentialIds);
  if (error) throw error;
}
