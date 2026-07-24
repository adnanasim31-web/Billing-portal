import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { deletePatientHistoryEntry } from "@/lib/services/patient-history-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { entryId } = await params;
  await deletePatientHistoryEntry({
    entryId,
    organizationId: user.organizationId,
    actingUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
