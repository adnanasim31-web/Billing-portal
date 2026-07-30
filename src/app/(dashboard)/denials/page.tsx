import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listDenials } from "@/lib/services/denial-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { DenialsFilters } from "@/components/denials/denials-filters";
import { DenialsTable, type DenialRow } from "@/components/denials/denials-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { DenialCategory, DenialResolutionStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Denials" };

interface DenialsPageProps {
  searchParams: Promise<{ query?: string; resolutionStatus?: string; category?: string; page?: string }>;
}

export default async function DenialsPage({ searchParams }: DenialsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.DENIALS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const resolutionStatus = (params.resolutionStatus as DenialResolutionStatus | "all" | undefined) ?? "all";
  const category = (params.category as DenialCategory | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { denials, total } = await listDenials({
    organizationId: user.organizationId,
    query: params.query,
    resolutionStatus,
    category,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: DenialRow[] = denials.map((d) => ({
    id: d.id,
    claimNumber: d.claims?.claim_number ?? "Unknown claim",
    patientName: d.claims?.patients ? `${d.claims.patients.first_name} ${d.claims.patients.last_name}` : "Unknown patient",
    category: d.category,
    resolutionStatus: d.resolution_status,
    followUpDate: d.follow_up_date,
    createdAt: d.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Denials" description={`${total} denial${total === 1 ? "" : "s"} on the worklist`} />
      <DenialsFilters />
      <DenialsTable denials={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
