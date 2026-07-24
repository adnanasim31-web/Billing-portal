import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getProviderById, updateProvider } from "@/lib/services/provider-service";
import { providerSchema } from "@/lib/validations/providers";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view providers" }, { status: 403 });
  }

  const { id } = await params;
  const provider = await getProviderById(id, user.organizationId);
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  return NextResponse.json(provider);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit providers" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = providerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const provider = await updateProvider({
      providerId: id,
      organizationId: user.organizationId,
      updatedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(provider);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update provider" },
      { status: 400 }
    );
  }
}
