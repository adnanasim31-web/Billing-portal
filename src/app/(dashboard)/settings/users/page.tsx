import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { listRoles } from "@/lib/services/role-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { UsersTable, type OrgUserRow } from "@/components/settings/users-table";

export const metadata: Metadata = { title: "Team Members" };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.USERS_VIEW)) redirect("/dashboard");

  const [rawUsers, roles] = await Promise.all([
    listOrganizationUsers(user.organizationId),
    listRoles(user.organizationId),
  ]);

  const users: OrgUserRow[] = rawUsers.map((u) => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    status: u.status,
    lastLoginAt: u.last_login_at,
    roleNames: (u.user_roles ?? [])
      .map((ur: { roles: { name: string } | null }) => ur.roles?.name)
      .filter(Boolean) as string[],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description={`${users.length} member${users.length === 1 ? "" : "s"} in your organization`}
        action={<InviteUserDialog roles={roles.map((r) => ({ id: r.id, name: r.name }))} />}
      />
      <UsersTable users={users} />
    </div>
  );
}
