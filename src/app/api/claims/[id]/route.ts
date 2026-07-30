import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getClaimById, updateClaim } from "@/lib/services/claim-service";
import { claimSchema } from "@/lib/validations/claims";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view claims" }, { status: 403 });
  }

  const { id } = await params;
  const detail = await getClaimById(id, user.organizationId);
  if (!detail) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit claims" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const claim = await updateClaim({
      claimId: id,
      organizationId: user.organizationId,
      updatedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(claim);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update claim" },
      { status: 400 }
    );
  }
}
