import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listDenials } from "@/lib/services/denial-service";
import { denialSearchSchema } from "@/lib/validations/denials";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DENIALS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view denials" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = denialSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    resolutionStatus: url.searchParams.get("resolutionStatus") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listDenials({
    organizationId: user.organizationId,
    query: parsed.data.query,
    resolutionStatus: parsed.data.resolutionStatus,
    category: parsed.data.category,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}
