import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { removeClaimLine } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit claims" }, { status: 403 });
  }

  const { id, lineId } = await params;
  try {
    await removeClaimLine({ lineId, claimId: id, organizationId: user.organizationId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove procedure line" },
      { status: 400 }
    );
  }
}
