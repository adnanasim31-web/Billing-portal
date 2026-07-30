import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { changeClaimStatus } from "@/lib/services/claim-service";
import { claimStatusChangeSchema } from "@/lib/validations/claims";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to change claim status" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = claimStatusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.status === "submitted" && !hasPermission(user, PERMISSIONS.CLAIMS_SUBMIT)) {
    return NextResponse.json({ error: "You do not have permission to submit claims" }, { status: 403 });
  }
  if (parsed.data.status === "appealed" && !hasPermission(user, PERMISSIONS.CLAIMS_APPEAL)) {
    return NextResponse.json({ error: "You do not have permission to file appeals" }, { status: 403 });
  }

  try {
    const claim = await changeClaimStatus({
      claimId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(claim);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update claim status" },
      { status: 400 }
    );
  }
}
