import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import {
  addProviderScheduleBlock,
  deleteProviderScheduleBlock,
  listProviderSchedule,
} from "@/lib/services/provider-schedule-service";
import type { ProviderPortalCredentialsInput, ProviderScheduleInput } from "@/lib/validations/providers";

export interface ProviderPortalUser {
  id: string;
  email: string;
  providerId: string;
  organizationId: string;
  displayName: string;
}

function resolveProviderDisplayName(provider: {
  provider_type: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  credential_suffix: string | null;
}): string {
  if (provider.provider_type === "organization") {
    return provider.organization_name ?? "Provider";
  }
  const name = `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
  return provider.credential_suffix ? `${name}, ${provider.credential_suffix}` : name;
}

/** Resolves the signed-in provider portal account, or null if this session isn't one. */
export async function getCurrentProviderPortalUser(): Promise<ProviderPortalUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("provider_portal_accounts")
    .select(
      "*, providers:provider_id (provider_type, first_name, last_name, organization_name, credential_suffix)"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!account || !account.providers) return null;

  return {
    id: account.id,
    email: account.email,
    providerId: account.provider_id,
    organizationId: account.organization_id,
    displayName: resolveProviderDisplayName(account.providers),
  };
}

export async function markProviderPortalLogin(accountId: string) {
  const admin = createAdminClient();
  await admin
    .from("provider_portal_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", accountId);
}

export async function getProviderPortalAccountStatus(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data: account, error } = await admin
    .from("provider_portal_accounts")
    .select("email, last_login_at, created_at")
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (account) return { state: "active" as const, ...account };
  return { state: "none" as const };
}

/**
 * Creates the provider's portal account on first setup, or updates its
 * email/password on subsequent calls - staff sets credentials directly
 * (no emailed invite link, unlike the patient portal). Leaving password
 * blank on an update keeps the current password; leaving it blank when no
 * account exists yet is a no-op (nothing to create without a password).
 */
export async function setProviderPortalCredentials(params: {
  providerId: string;
  organizationId: string;
  setBy: string;
  input: ProviderPortalCredentialsInput;
}) {
  const admin = createAdminClient();
  const email = params.input.email?.trim();

  const { data: existing, error: existingError } = await admin
    .from("provider_portal_accounts")
    .select("id, email")
    .eq("provider_id", params.providerId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    if (!email || !params.input.password) {
      throw new Error("Enter both an email and a password to set up portal access.");
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: params.input.password,
      email_confirm: true,
      user_metadata: { provider_portal: true, provider_id: params.providerId },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Unable to create the provider's login");
    }

    const { error: accountError } = await admin.from("provider_portal_accounts").insert({
      id: created.user.id,
      organization_id: params.organizationId,
      provider_id: params.providerId,
      email,
      set_by: params.setBy,
    });
    if (accountError) throw accountError;

    await recordAuditLog({
      organizationId: params.organizationId,
      userId: params.setBy,
      action: "provider_portal.credentials_set",
      entityType: "provider",
      entityId: params.providerId,
    });

    return { created: true as const };
  }

  const authUpdate: { email?: string; password?: string } = {};
  if (email && email !== existing.email) authUpdate.email = email;
  if (params.input.password) authUpdate.password = params.input.password;

  if (Object.keys(authUpdate).length > 0) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, authUpdate);
    if (updateError) throw new Error(updateError.message);
  }

  if (authUpdate.email) {
    const { error: rowError } = await admin
      .from("provider_portal_accounts")
      .update({ email: authUpdate.email })
      .eq("id", existing.id);
    if (rowError) throw rowError;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.setBy,
    action: "provider_portal.credentials_updated",
    entityType: "provider",
    entityId: params.providerId,
  });

  return { created: false as const };
}

const PORTAL_APPOINTMENT_SELECT =
  "id, appointment_type, scheduled_start, scheduled_end, status, reason, location, patients:patient_id (first_name, last_name)";

export async function getProviderPortalAppointments(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(PORTAL_APPOINTMENT_SELECT)
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

const PORTAL_PROVIDER_CLAIM_SELECT =
  "id, claim_number, status, service_date_from, service_date_to, total_charge_amount, total_paid_amount, balance_amount, patients:patient_id (first_name, last_name)";

export async function getProviderPortalClaims(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select(PORTAL_PROVIDER_CLAIM_SELECT)
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("service_date_from", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getProviderPortalCredentials(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_credentials")
    .select("id, credential_type, credential_number, issuing_authority, issue_date, expiration_date, status")
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("expiration_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProviderPortalSchedule(providerId: string, organizationId: string) {
  return listProviderSchedule(providerId, organizationId);
}

/** Provider self-service add - actingUserId is null (no staff profile row to attribute this to). */
export async function addProviderPortalScheduleBlock(params: {
  providerId: string;
  organizationId: string;
  input: ProviderScheduleInput;
}) {
  return addProviderScheduleBlock({
    providerId: params.providerId,
    organizationId: params.organizationId,
    actingUserId: null,
    input: params.input,
  });
}

/**
 * Provider self-service delete - unlike the staff-facing
 * deleteProviderScheduleBlock (which only scopes by organizationId, since
 * any staff member with providers.manage may edit any provider's
 * schedule), this must also verify the block actually belongs to the
 * requesting provider - otherwise one provider could delete another
 * provider's availability by guessing a schedule ID.
 */
export async function deleteProviderPortalScheduleBlock(params: {
  scheduleId: string;
  providerId: string;
  organizationId: string;
}) {
  const admin = createAdminClient();
  const { data: block, error } = await admin
    .from("provider_schedules")
    .select("id")
    .eq("id", params.scheduleId)
    .eq("provider_id", params.providerId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!block) throw new Error("Availability block not found");

  return deleteProviderScheduleBlock({
    scheduleId: params.scheduleId,
    organizationId: params.organizationId,
    actingUserId: null,
  });
}
