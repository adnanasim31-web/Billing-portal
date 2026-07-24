import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { searchProcedureCodes } from "@/lib/services/coding-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

const querySchema = z.object({
  query: z.string().max(160).optional(),
  codeSet: z.enum(["CPT", "HCPCS"]).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the coding library" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    codeSet: url.searchParams.get("codeSet") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const codes = await searchProcedureCodes(parsed.data.query, parsed.data.codeSet);
  return NextResponse.json(codes);
}
