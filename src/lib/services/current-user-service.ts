import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  organizationId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
}

/** Resolves the authenticated user's profile, roles, and effective permission set. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const admin = createAdminClient();
  const { data: userRoles } = await admin
    .from("user_roles")
    .select("roles(name, slug, role_permissions(permissions(slug)))")
    .eq("user_id", user.id);

  const roles = (userRoles ?? []).map((ur) => ur.roles?.slug).filter(Boolean) as string[];
  const permissions = Array.from(
    new Set(
      (userRoles ?? []).flatMap(
        (ur) =>
          ur.roles?.role_permissions?.map((rp) => rp.permissions?.slug).filter(Boolean) ?? []
      )
    )
  ) as string[];

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url,
    jobTitle: profile.job_title,
    organizationId: profile.organization_id,
    isSuperAdmin: profile.is_super_admin,
    roles,
    permissions,
  };
}

export function hasPermission(user: CurrentUser | null, permissionSlug: string): boolean {
  if (!user) return false;
  return user.isSuperAdmin || user.permissions.includes(permissionSlug);
}
