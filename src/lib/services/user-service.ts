import "server-only";
import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { UserStatus } from "@/types/database.types";

export async function listOrganizationUsers(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, email, first_name, last_name, avatar_url, job_title, status, last_login_at, created_at, user_roles!user_roles_user_id_fkey(role_id, roles(name, slug))"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export interface InviteUserInput {
  organizationId: string;
  email: string;
  roleId: string;
  invitedBy: string;
}

export async function inviteUser(input: InviteUserInput) {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { data: invitation, error } = await admin
    .from("invitations")
    .insert({
      organization_id: input.organizationId,
      email: input.email,
      role_id: input.roleId,
      invited_by: input.invitedBy,
      token_hash: tokenHash,
    })
    .select("id")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: input.organizationId,
    userId: input.invitedBy,
    action: "user.invited",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { email: input.email },
  });

  // rawToken is returned so the caller can email an accept-invite link;
  // it is never stored - only its hash is persisted.
  return { invitationId: invitation.id, rawToken };
}

export async function updateUserStatus(params: {
  userId: string;
  status: UserStatus;
  actingUserId: string;
  organizationId: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: params.status })
    .eq("id", params.userId)
    .eq("organization_id", params.organizationId);

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "user.status_changed",
    entityType: "profile",
    entityId: params.userId,
    metadata: { status: params.status },
  });
}

export async function getUserWithRoles(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*, user_roles(role_id, roles(id, name, slug))")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
