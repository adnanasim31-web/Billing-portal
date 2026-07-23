import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";
import { isTwoFactorEnabled } from "@/lib/services/two-factor-service";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export interface RegisterOrganizationInput {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type RegisterResult =
  | { ok: true; userId: string; organizationId: string; emailConfirmationRequired: boolean }
  | { ok: false; error: string };

/**
 * Self-service sign-up: provisions a brand-new organization, creates the
 * auth user (which cascades into public.profiles via the handle_new_user
 * trigger), and grants the built-in "Owner" role.
 */
export async function registerOrganizationOwner(
  input: RegisterOrganizationInput
): Promise<RegisterResult> {
  const admin = createAdminClient();
  const baseSlug = slugify(input.organizationName) || "org";
  let slug = baseSlug;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({ name: input.organizationName, slug })
    .select("id")
    .single();

  if (orgError || !organization) {
    return { ok: false, error: orgError?.message ?? "Failed to create organization" };
  }

  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("slug", "owner")
    .single();

  const supabase = await createServerSupabaseClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        organization_id: organization.id,
        job_title: "Owner",
      },
    },
  });

  if (signUpError || !signUpData.user) {
    await admin.from("organizations").delete().eq("id", organization.id);
    return { ok: false, error: signUpError?.message ?? "Failed to create user" };
  }

  if (ownerRole) {
    await admin.from("user_roles").insert({
      user_id: signUpData.user.id,
      role_id: ownerRole.id,
      organization_id: organization.id,
      assigned_by: signUpData.user.id,
    });
  }

  await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", signUpData.user.id);

  await recordAuditLog({
    organizationId: organization.id,
    userId: signUpData.user.id,
    action: "auth.organization_registered",
    entityType: "organization",
    entityId: organization.id,
  });

  return {
    ok: true,
    userId: signUpData.user.id,
    organizationId: organization.id,
    emailConfirmationRequired: !signUpData.session,
  };
}

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
}

export async function getLockoutStatus(email: string): Promise<LockoutStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("failed_login_attempts, locked_until")
    .eq("email", email)
    .maybeSingle();

  if (!data) return { isLocked: false, lockedUntil: null, failedAttempts: 0 };

  const isLocked = !!data.locked_until && new Date(data.locked_until).getTime() > Date.now();
  return { isLocked, lockedUntil: data.locked_until, failedAttempts: data.failed_login_attempts };
}

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string | null;
  success: boolean;
  reason?: string;
}) {
  const admin = createAdminClient();
  await admin.from("login_attempts").insert({
    email: params.email,
    ip_address: params.ipAddress,
    success: params.success,
    reason: params.reason ?? null,
  });
}

/** Increments the failure counter and locks the account past MAX_FAILED_ATTEMPTS. */
export async function handleFailedLogin(email: string): Promise<void> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, failed_login_attempts")
    .eq("email", email)
    .maybeSingle();

  if (!profile) return;

  const nextCount = profile.failed_login_attempts + 1;
  const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS;

  await admin
    .from("profiles")
    .update({
      failed_login_attempts: nextCount,
      locked_until: shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null,
    })
    .eq("id", profile.id);
}

export async function handleSuccessfulLogin(params: {
  userId: string;
  ipAddress: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_ip: params.ipAddress,
    })
    .eq("id", params.userId);
}

export async function requiresTwoFactor(userId: string): Promise<boolean> {
  return isTwoFactorEnabled(userId);
}
