import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getDenialById, updateDenial } from "@/lib/services/denial-service";
import { denialUpdateSchema } from "@/lib/validations/denials";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DENIALS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view denials" }, { status: 403 });
  }

  const { id } = await params;
  const denial = await getDenialById(id, user.organizationId);
  if (!denial) return NextResponse.json({ error: "Denial not found" }, { status: 404 });

  return NextResponse.json(denial);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DENIALS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage denials" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = denialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const denial = await updateDenial({
      denialId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(denial);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update denial" },
      { status: 400 }
    );
  }
}
