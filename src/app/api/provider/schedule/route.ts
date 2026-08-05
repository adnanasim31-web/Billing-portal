import { NextResponse } from "next/server";
import { getCurrentProviderPortalUser } from "@/lib/services/provider-portal-service";
import {
  getProviderPortalSchedule,
  addProviderPortalScheduleBlock,
} from "@/lib/services/provider-portal-service";
import { providerScheduleSchema } from "@/lib/validations/providers";

export async function GET() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const schedule = await getProviderPortalSchedule(providerUser.providerId, providerUser.organizationId);
  return NextResponse.json(schedule);
}

export async function POST(request: Request) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = providerScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const block = await addProviderPortalScheduleBlock({
      providerId: providerUser.providerId,
      organizationId: providerUser.organizationId,
      input: parsed.data,
    });
    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to add availability";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
