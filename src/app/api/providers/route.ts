import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listProviders, createProvider } from "@/lib/services/provider-service";
import { providerSchema, providerSearchSchema } from "@/lib/validations/providers";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view providers" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = providerSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const result = await listProviders({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    page: parsed.data.page,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to add providers" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = providerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const provider = await createProvider({
      organizationId: user.organizationId,
      createdBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create provider" },
      { status: 400 }
    );
  }
}
