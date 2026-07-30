import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { updateCredential, deleteCredential } from "@/lib/services/credentialing-service";
import { credentialSchema } from "@/lib/validations/credentialing";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; credentialId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage credentialing records" }, { status: 403 });
  }

  const { credentialId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = credentialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const credential = await updateCredential({
    credentialId,
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(credential);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; credentialId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage credentialing records" }, { status: 403 });
  }

  const { credentialId } = await params;
  await deleteCredential({
    credentialId,
    organizationId: user.organizationId,
    actingUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
