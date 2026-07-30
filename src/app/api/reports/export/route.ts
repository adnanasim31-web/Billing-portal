import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getReportsSummary } from "@/lib/services/report-service";
import { toCsv } from "@/lib/services/report-aggregation";
import { reportExportSchema } from "@/lib/validations/reports";
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
  const parsed = reportExportSchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const fallback = defaultRange();
  const range = { from: parsed.data.from ?? fallback.from, to: parsed.data.to ?? fallback.to };
  const summary = await getReportsSummary(user.organizationId, range);

  let csv = "";
  switch (parsed.data.type) {
    case "status":
      csv = toCsv(
        Object.entries(summary.statusSummary).map(([status, entry]) => ({
          status,
          claims: entry?.count ?? 0,
          totalCharge: entry?.totalCharge ?? 0,
        }))
      );
      break;
    case "collections":
      csv = toCsv([
        {
          totalCharge: summary.collectionsSummary.totalCharge,
          totalPaid: summary.collectionsSummary.totalPaid,
          totalAdjustment: summary.collectionsSummary.totalAdjustment,
          totalBalance: summary.collectionsSummary.totalBalance,
          collectionRatePercent: (summary.collectionsSummary.collectionRate * 100).toFixed(1),
        },
      ]);
      break;
    case "providers":
      csv = toCsv(
        summary.providerProduction.map((p) => ({
          provider: p.providerName,
          claims: p.claimCount,
          totalCharge: p.totalCharge,
          totalPaid: p.totalPaid,
        }))
      );
      break;
    case "denials":
      csv = toCsv(
        Object.entries(summary.denialCategorySummary).map(([category, count]) => ({
          category,
          count: count ?? 0,
        }))
      );
      break;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${parsed.data.type}-report-${range.from}-to-${range.to}.csv"`,
    },
  });
}
