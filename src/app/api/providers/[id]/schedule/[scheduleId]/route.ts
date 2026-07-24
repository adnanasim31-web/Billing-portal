import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { deleteProviderScheduleBlock } from "@/lib/services/provider-schedule-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit providers" }, { status: 403 });
  }

  const { scheduleId } = await params;
  await deleteProviderScheduleBlock({
    scheduleId,
    organizationId: user.organizationId,
    actingUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
