import { NextResponse } from "next/server";
import {
  getCurrentProviderPortalUser,
  getProviderPortalMessages,
  postProviderPortalMessage,
} from "@/lib/services/provider-portal-service";
import { providerMessageSchema } from "@/lib/validations/provider-messaging";

export async function GET() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const messages = await getProviderPortalMessages(providerUser.providerId, providerUser.organizationId);
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = providerMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const message = await postProviderPortalMessage({
    providerId: providerUser.providerId,
    organizationId: providerUser.organizationId,
    senderProviderAccountId: providerUser.id,
    input: parsed.data,
  });
  return NextResponse.json(message, { status: 201 });
}
