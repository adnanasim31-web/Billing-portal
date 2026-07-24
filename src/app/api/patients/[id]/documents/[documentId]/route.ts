import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { deletePatientDocument } from "@/lib/services/patient-document-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to delete documents" }, { status: 403 });
  }

  const { documentId } = await params;
  await deletePatientDocument({
    documentId,
    organizationId: user.organizationId,
    actingUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
