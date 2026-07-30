import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getReportsSummary } from "@/lib/services/report-service";
import { reportDateRangeSchema } from "@/lib/validations/reports";
import { PERMISSIONS } from "@/lib/constants/permissions";

const DEFAULT_RANGE_DAYS = 90;

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - DEFAULT_RANGE_DAYS);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view reports" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = reportDateRangeSchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const fallback = defaultRange();
  const summary = await getReportsSummary(user.organizationId, {
    from: parsed.data.from ?? fallback.from,
    to: parsed.data.to ?? fallback.to,
  });

  return NextResponse.json(summary);
}
