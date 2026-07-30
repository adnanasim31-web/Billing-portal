import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getReportsSummary } from "@/lib/services/report-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ReportDateRangeFilter } from "@/components/reports/report-date-range-filter";
import {
  ClaimsStatusSection,
  CollectionsSection,
  ProviderProductionSection,
  DenialCategorySection,
} from "@/components/reports/report-summary-sections";

const DEFAULT_RANGE_DAYS = 90;

export const metadata: Metadata = { title: "Reports" };

interface ReportsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - DEFAULT_RANGE_DAYS);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.REPORTS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const fallback = defaultRange();
  const range = { from: params.from ?? fallback.from, to: params.to ?? fallback.to };

  const summary = await getReportsSummary(user.organizationId, range);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Claims, collections, and denial trends for the selected date range." />
      <ReportDateRangeFilter from={range.from} to={range.to} />
      <CollectionsSection summary={summary.collectionsSummary} from={range.from} to={range.to} />
      <ClaimsStatusSection summary={summary.statusSummary} from={range.from} to={range.to} />
      <ProviderProductionSection entries={summary.providerProduction} from={range.from} to={range.to} />
      <DenialCategorySection
        summary={summary.denialCategorySummary}
        denialRate={summary.denialRate}
        from={range.from}
        to={range.to}
      />
    </div>
  );
}
