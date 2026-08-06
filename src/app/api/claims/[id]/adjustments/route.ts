import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { createClaimAdjustment, listAdjustmentsForClaim } from "@/lib/services/claim-adjustment-service";
import { claimAdjustmentSchema } from "@/lib/validations/claim-adjustments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view claims" }, { status: 403 });
  }

  const { id } = await params;
  const adjustments = await listAdjustmentsForClaim(id, user.organizationId);
  return NextResponse.json(adjustments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_POST)) {
    return NextResponse.json({ error: "You do not have permission to post payments or adjustments" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = claimAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const adjustment = await createClaimAdjustment({
      claimId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(adjustment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to post adjustment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
