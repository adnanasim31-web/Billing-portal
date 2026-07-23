import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function listRoles(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roles")
    .select("id, name, slug, description, is_system, role_permissions(permission_id)")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order("is_system", { ascending: false })
    .order("name");

  if (error) throw error;
  return data;
}

export async function listPermissionCatalog() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("permissions")
    .select("id, slug, module, label, description")
    .order("module")
    .order("label");

  if (error) throw error;
  return data;
}

export interface CreateRoleInput {
  organizationId: string;
  name: string;
  description?: string;
  permissionIds: string[];
  createdBy: string;
}

export async function createCustomRole(input: CreateRoleInput) {
  const admin = createAdminClient();
  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data: role, error: roleError } = await admin
    .from("roles")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      slug,
      description: input.description ?? null,
      is_system: false,
    })
    .select("id")
    .single();

  if (roleError) throw roleError;

  const { error: rpError } = await admin
    .from("role_permissions")
    .insert(input.permissionIds.map((permission_id) => ({ role_id: role.id, permission_id })));

  if (rpError) throw rpError;

  await recordAuditLog({
    organizationId: input.organizationId,
    userId: input.createdBy,
    action: "role.created",
    entityType: "role",
    entityId: role.id,
    metadata: { name: input.name, permissionCount: input.permissionIds.length },
  });

  return role;
}

export async function assignRoleToUser(params: {
  userId: string;
  roleId: string;
  organizationId: string;
  assignedBy: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("user_roles").insert({
    user_id: params.userId,
    role_id: params.roleId,
    organization_id: params.organizationId,
    assigned_by: params.assignedBy,
  });

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.assignedBy,
    action: "user.role_assigned",
    entityType: "profile",
    entityId: params.userId,
    metadata: { roleId: params.roleId },
  });
}

export async function revokeRoleFromUser(params: {
  userId: string;
  roleId: string;
  organizationId: string;
  revokedBy: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", params.userId)
    .eq("role_id", params.roleId);

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.revokedBy,
    action: "user.role_revoked",
    entityType: "profile",
    entityId: params.userId,
    metadata: { roleId: params.roleId },
  });
}
