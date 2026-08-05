import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listProviderMessages, postProviderMessageAsStaff } from "@/lib/services/provider-messaging-service";
import { providerMessageSchema } from "@/lib/validations/provider-messaging";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view providers" }, { status: 403 });
  }

  const { id } = await params;
  const messages = await listProviderMessages(id, user.organizationId);
  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage providers" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = providerMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const message = await postProviderMessageAsStaff({
    providerId: id,
    organizationId: user.organizationId,
    senderProfileId: user.id,
    input: parsed.data,
  });
  return NextResponse.json(message, { status: 201 });
}
