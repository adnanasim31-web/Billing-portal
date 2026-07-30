import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listChannels, createChannel } from "@/lib/services/messaging-service";
import { channelSchema } from "@/lib/validations/messaging";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.MESSAGING_USE)) {
    return NextResponse.json({ error: "You do not have permission to use messaging" }, { status: 403 });
  }

  const channels = await listChannels(user.organizationId);
  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.MESSAGING_USE)) {
    return NextResponse.json({ error: "You do not have permission to use messaging" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const channel = await createChannel({
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create channel" },
      { status: 400 }
    );
  }
}
