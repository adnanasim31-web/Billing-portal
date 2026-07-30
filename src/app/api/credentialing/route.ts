import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listCredentials } from "@/lib/services/credentialing-service";
import { credentialSearchSchema } from "@/lib/validations/credentialing";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view credentialing records" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = credentialSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    expiringSoon: url.searchParams.get("expiringSoon") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listCredentials({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    expiringSoon: parsed.data.expiringSoon,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}
