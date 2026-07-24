import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listRoles, listPermissionCatalog } from "@/lib/services/role-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { RolesGrid } from "@/components/settings/roles-grid";
import { CreateRoleDialog } from "@/components/settings/create-role-dialog";

export const metadata: Metadata = { title: "Roles & Permissions" };

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ROLES_MANAGE)) redirect("/dashboard");

  const [roles, permissions] = await Promise.all([
    listRoles(user.organizationId),
    listPermissionCatalog(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Control what each role can see and do across the suite."
        action={
          <CreateRoleDialog
            permissions={permissions.map((p) => ({
              id: p.id,
              slug: p.slug,
              module: p.module,
              label: p.label,
            }))}
          />
        }
      />
      <RolesGrid
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.is_system,
          permissionCount: (r.role_permissions ?? []).length,
        }))}
      />
    </div>
  );
}
