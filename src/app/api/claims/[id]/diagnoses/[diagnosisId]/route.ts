import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { removeClaimDiagnosis } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; diagnosisId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit claims" }, { status: 403 });
  }

  const { id, diagnosisId } = await params;
  try {
    await removeClaimDiagnosis({ diagnosisId, claimId: id, organizationId: user.organizationId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove diagnosis" },
      { status: 400 }
    );
  }
}
