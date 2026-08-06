import { NextResponse } from "next/server";
import { getCurrentProviderPortalUser, deleteProviderPortalScheduleBlock } from "@/lib/services/provider-portal-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { scheduleId } = await params;

  try {
    await deleteProviderPortalScheduleBlock({
      scheduleId,
      providerId: providerUser.providerId,
      organizationId: providerUser.organizationId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to remove availability";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
