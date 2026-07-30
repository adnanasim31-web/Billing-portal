import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listEligibilityChecks, runEligibilityCheck } from "@/lib/services/eligibility-service";
import { eligibilityCheckSchema, eligibilitySearchSchema } from "@/lib/validations/eligibility";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view eligibility checks" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = eligibilitySearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listEligibilityChecks({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_RUN)) {
    return NextResponse.json({ error: "You do not have permission to run eligibility checks" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = eligibilityCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const check = await runEligibilityCheck({
      organizationId: user.organizationId,
      checkedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(check, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run eligibility check" },
      { status: 400 }
    );
  }
}
