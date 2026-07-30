import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listMessages, postMessage } from "@/lib/services/messaging-service";
import { messageSchema } from "@/lib/validations/messaging";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.MESSAGING_USE)) {
    return NextResponse.json({ error: "You do not have permission to use messaging" }, { status: 403 });
  }

  const { channelId } = await params;
  const messages = await listMessages(channelId, user.organizationId);
  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ channelId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.MESSAGING_USE)) {
    return NextResponse.json({ error: "You do not have permission to use messaging" }, { status: 403 });
  }

  const { channelId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const message = await postMessage({
    channelId,
    organizationId: user.organizationId,
    authorId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(message, { status: 201 });
}
