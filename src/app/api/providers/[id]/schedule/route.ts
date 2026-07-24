import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listProviderSchedule, addProviderScheduleBlock } from "@/lib/services/provider-schedule-service";
import { providerScheduleSchema } from "@/lib/validations/providers";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view providers" }, { status: 403 });
  }

  const { id } = await params;
  const schedule = await listProviderSchedule(id, user.organizationId);
  return NextResponse.json(schedule);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit providers" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = providerScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const block = await addProviderScheduleBlock({
    providerId: id,
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(block, { status: 201 });
}
