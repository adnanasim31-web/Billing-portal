import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listArClaims, getArAgingSummary } from "@/lib/services/ar-service";
import { calculateDaysOutstanding, type AgingBucket } from "@/lib/services/ar-aging";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ArAgingSummary } from "@/components/ar/ar-aging-summary";
import { ArFilters } from "@/components/ar/ar-filters";
import { ArTable, type ArClaimRow } from "@/components/ar/ar-table";
import { ServerPagination } from "@/components/shared/server-pagination";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Accounts Receivable" };

interface ArPageProps {
  searchParams: Promise<{ query?: string; agingBucket?: string; page?: string }>;
}

export default async function ArPage({ searchParams }: ArPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.AR_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const agingBucket = (params.agingBucket as AgingBucket | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;
  const today = new Date().toISOString().slice(0, 10);

  const [{ claims, total }, summary] = await Promise.all([
    listArClaims({
      organizationId: user.organizationId,
      query: params.query,
      agingBucket,
      page,
      pageSize: PAGE_SIZE,
    }),
    getArAgingSummary(user.organizationId),
  ]);

  const rows: ArClaimRow[] = claims.map((c) => {
    const anchorDate = c.submitted_at ? c.submitted_at.slice(0, 10) : c.service_date_from;
    return {
      id: c.id,
      claimNumber: c.claim_number,
      patientName: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown patient",
      patientMrn: c.patients?.mrn ?? "",
      payerName: c.insurance_companies?.name ?? null,
      balanceAmount: Number(c.balance_amount),
      daysOutstanding: calculateDaysOutstanding(anchorDate, today),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts Receivable" description={`${total} claim${total === 1 ? "" : "s"} with an open balance`} />
      <ArAgingSummary summary={summary} />
      <ArFilters />
      <ArTable claims={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
