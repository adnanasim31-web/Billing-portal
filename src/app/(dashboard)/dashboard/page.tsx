import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getArOverview } from "@/lib/services/ar-service";
import { countActiveDenials } from "@/lib/services/denial-service";
import {
  getAllTimeClaimsStatusCounts,
  getMonthlyBillingTrend,
  getReportsSummary,
  type ClaimStatusCount,
} from "@/lib/services/report-service";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ClaimStatusDonut, type ClaimStatusDatum } from "@/components/dashboard/claim-status-donut";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ClaimStatus } from "@/types/database.types";

export const metadata: Metadata = { title: "Dashboard" };

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Groups the raw claim statuses into the four buckets the donut chart displays. */
const STATUS_GROUP: Record<ClaimStatus, { label: string; color: string }> = {
  draft: { label: "Pending", color: "#B7791F" },
  ready: { label: "Pending", color: "#B7791F" },
  submitted: { label: "Pending", color: "#B7791F" },
  accepted: { label: "Pending", color: "#B7791F" },
  appealed: { label: "In Review", color: "#14B8A6" },
  denied: { label: "Denied", color: "#D5433C" },
  rejected: { label: "Denied", color: "#D5433C" },
  paid: { label: "Paid", color: "#0E9F6E" },
  closed: { label: "Closed", color: "#94A3B8" },
};
const STATUS_GROUP_ORDER = ["Paid", "Pending", "Denied", "In Review", "Closed"];

function buildClaimStatusDonutData(counts: ClaimStatusCount[]): ClaimStatusDatum[] {
  const byLabel = new Map<string, ClaimStatusDatum>();
  for (const { status, count } of counts) {
    const group = STATUS_GROUP[status];
    const existing = byLabel.get(group.label);
    if (existing) existing.value += count;
    else byLabel.set(group.label, { name: group.label, value: count, color: group.color });
  }
  return STATUS_GROUP_ORDER.map((label) => byLabel.get(label)).filter((d): d is ClaimStatusDatum => Boolean(d));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Month-to-date range, `monthsAgo` months back, clamped to the same day-of-month for a fair comparison. */
function mtdRange(monthsAgo: number, dayOfMonth: number, now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const clampedDay = Math.min(dayOfMonth, daysInMonth(start.getUTCFullYear(), start.getUTCMonth()));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), clampedDay));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/** Relative % change; undefined when there's no non-zero baseline to compare against. */
function percentChange(current: number, previous: number): number | undefined {
  return previous > 0 ? ((current - previous) / previous) * 100 : undefined;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) redirect("/settings/profile");

  const now = new Date();
  const currentRange = mtdRange(0, now.getUTCDate(), now);
  const previousRange = mtdRange(1, now.getUTCDate(), now);

  const [currentSummary, previousSummary, arOverview, activeDenialCount, monthlyTrend, statusCounts] =
    await Promise.all([
      getReportsSummary(user.organizationId, currentRange),
      getReportsSummary(user.organizationId, previousRange),
      getArOverview(user.organizationId),
      countActiveDenials(user.organizationId),
      getMonthlyBillingTrend(user.organizationId, 6),
      getAllTimeClaimsStatusCounts(user.organizationId),
    ]);

  const billedChange = percentChange(
    currentSummary.collectionsSummary.totalCharge,
    previousSummary.collectionsSummary.totalCharge
  );
  const collectedChange = percentChange(
    currentSummary.collectionsSummary.totalPaid,
    previousSummary.collectionsSummary.totalPaid
  );
  const denialRateChange =
    previousSummary.billedClaimCount > 0
      ? (currentSummary.denialRate - previousSummary.denialRate) * 100
      : undefined;

  const revenueChartData = monthlyTrend.map((point) => ({ month: point.month, amount: point.billedAmount }));
  const claimStatusData = buildClaimStatusDonutData(statusCounts);
  const denialCount = Object.values(currentSummary.denialCategorySummary).reduce(
    (sum: number, count) => sum + (count ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back, {user.firstName}</h2>
        <p className="text-sm text-muted-foreground">Here&apos;s a snapshot of your revenue cycle.</p>
      </div>

      {activeDenialCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" />
          <p className="text-sm">
            <span className="font-medium">
              {activeDenialCount} {activeDenialCount === 1 ? "denial needs" : "denials need"} attention
            </span>{" "}
            <Link href="/denials" className="text-muted-foreground underline underline-offset-2">
              review the denials worklist
            </Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MTD Billed"
          value={currencyFormatter.format(currentSummary.collectionsSummary.totalCharge)}
          caption={`${currentRange.label} so far`}
          changePercent={billedChange}
        />
        <KpiCard
          label="MTD Collected"
          value={currencyFormatter.format(currentSummary.collectionsSummary.totalPaid)}
          caption={`${(currentSummary.collectionsSummary.collectionRate * 100).toFixed(1)}% collection rate`}
          changePercent={collectedChange}
        />
        <KpiCard
          label="Outstanding AR"
          value={currencyFormatter.format(arOverview.totalBalance)}
          caption={
            arOverview.claimCount > 0
              ? `Avg age: ${arOverview.averageDaysOutstanding.toFixed(1)} days`
              : "No open balances"
          }
          increaseIsGood={false}
        />
        <KpiCard
          label="Denial Rate"
          value={`${(currentSummary.denialRate * 100).toFixed(1)}%`}
          caption={`${denialCount} of ${currentSummary.billedClaimCount} claims`}
          changePercent={denialRateChange}
          increaseIsGood={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Billing Volume</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claim Status Mix</CardTitle>
            <CardDescription>All claims, all time</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimStatusDonut data={claimStatusData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
