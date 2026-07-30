import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listCredentialsForProvider, createCredential } from "@/lib/services/credentialing-service";
import { credentialSchema } from "@/lib/validations/credentialing";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view credentialing records" }, { status: 403 });
  }

  const { id } = await params;
  const credentials = await listCredentialsForProvider(id, user.organizationId);
  return NextResponse.json(credentials);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage credentialing records" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = credentialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const credential = await createCredential({
    providerId: id,
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(credential, { status: 201 });
}
