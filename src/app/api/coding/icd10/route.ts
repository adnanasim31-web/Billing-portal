import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { searchIcd10Codes } from "@/lib/services/coding-service";
import { codingSearchSchema } from "@/lib/validations/coding";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the coding library" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = codingSearchSchema.safeParse({ query: url.searchParams.get("query") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const codes = await searchIcd10Codes(parsed.data.query);
  return NextResponse.json(codes);
}
