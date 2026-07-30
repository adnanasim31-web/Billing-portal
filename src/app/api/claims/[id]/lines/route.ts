import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { addClaimLine } from "@/lib/services/claim-service";
import { claimLineSchema } from "@/lib/validations/claims";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit claims" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = claimLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const line = await addClaimLine({
      claimId: id,
      organizationId: user.organizationId,
      input: parsed.data,
    });
    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add procedure line" },
      { status: 400 }
    );
  }
}
