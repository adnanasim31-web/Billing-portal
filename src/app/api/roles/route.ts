import { NextResponse } from "next/server";
import { createRoleSchema } from "@/lib/validations/auth";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { createCustomRole } from "@/lib/services/role-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.ROLES_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage roles" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const role = await createCustomRole({
    organizationId: user.organizationId,
    name: parsed.data.name,
    description: parsed.data.description,
    permissionIds: parsed.data.permissionIds,
    createdBy: user.id,
  });

  return NextResponse.json({ id: role.id });
}
