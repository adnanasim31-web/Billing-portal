import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import {
  getProviderPortalAccountStatus,
  setProviderPortalCredentials,
} from "@/lib/services/provider-portal-service";
import { providerPortalCredentialsSchema } from "@/lib/validations/providers";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view providers" }, { status: 403 });
  }

  const { id } = await params;
  const status = await getProviderPortalAccountStatus(id, user.organizationId);
  return NextResponse.json(status);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage providers" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = providerPortalCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const result = await setProviderPortalCredentials({
      providerId: id,
      organizationId: user.organizationId,
      setBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to set portal access";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
