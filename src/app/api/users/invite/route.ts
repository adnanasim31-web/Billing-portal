import { NextResponse } from "next/server";
import { inviteUserSchema } from "@/lib/validations/auth";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { inviteUser } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to invite users" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { rawToken } = await inviteUser({
    organizationId: user.organizationId,
    email: parsed.data.email,
    roleId: parsed.data.roleId,
    invitedBy: user.id,
  });

  // TODO(Documents/Notifications module): send this via the transactional
  // email service instead of returning it. Logged for local development.
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${rawToken}`;
  console.info(`[invite] ${parsed.data.email} -> ${inviteUrl}`);

  return NextResponse.json({ ok: true });
}
