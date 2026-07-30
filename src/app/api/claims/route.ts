import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listClaims, createClaim } from "@/lib/services/claim-service";
import { claimSchema, claimSearchSchema } from "@/lib/validations/claims";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view claims" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = claimSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    providerId: url.searchParams.get("providerId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listClaims({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    providerId: parsed.data.providerId || undefined,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to create claims" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const claim = await createClaim({
      organizationId: user.organizationId,
      createdBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create claim" },
      { status: 400 }
    );
  }
}
