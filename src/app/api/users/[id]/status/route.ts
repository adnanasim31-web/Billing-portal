import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { updateUserStatus } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

const statusSchema = z.object({
  status: z.enum(["invited", "active", "suspended", "disabled"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage users" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json({ error: "You cannot change your own access status" }, { status: 400 });
  }

  await updateUserStatus({
    userId: id,
    status: parsed.data.status,
    actingUserId: user.id,
    organizationId: user.organizationId,
  });

  return NextResponse.json({ ok: true });
}
