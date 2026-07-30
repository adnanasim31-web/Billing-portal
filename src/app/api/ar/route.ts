import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listArClaims } from "@/lib/services/ar-service";
import { arSearchSchema } from "@/lib/validations/ar";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.AR_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view accounts receivable" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = arSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    agingBucket: url.searchParams.get("agingBucket") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listArClaims({
    organizationId: user.organizationId,
    query: parsed.data.query,
    agingBucket: parsed.data.agingBucket,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}
