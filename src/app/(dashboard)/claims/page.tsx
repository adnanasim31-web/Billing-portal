import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listClaims } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ClaimsFilters } from "@/components/claims/claims-filters";
import { ClaimsTable, type ClaimRow } from "@/components/claims/claims-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { ClaimStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Claims" };

interface ClaimsPageProps {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}

export default async function ClaimsPage({ searchParams }: ClaimsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const status = (params.status as ClaimStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { claims, total } = await listClaims({
    organizationId: user.organizationId,
    query: params.query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: ClaimRow[] = claims.map((c) => ({
    id: c.id,
    claimNumber: c.claim_number,
    patientName: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown patient",
    patientMrn: c.patients?.mrn ?? "",
    providerName: c.providers
      ? c.providers.provider_type === "organization"
        ? (c.providers.organization_name ?? "Unknown provider")
        : `${c.providers.first_name ?? ""} ${c.providers.last_name ?? ""}`.trim()
      : "Unknown provider",
    serviceDateFrom: c.service_date_from,
    serviceDateTo: c.service_date_to,
    totalChargeAmount: Number(c.total_charge_amount),
    status: c.status,
  }));

  const canManage = hasPermission(user, PERMISSIONS.CLAIMS_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Claims"
        description={`${total} claim${total === 1 ? "" : "s"} across every status`}
        action={
          canManage ? (
            <Button asChild>
              <Link href="/claims/new">
                <FilePlus2 className="h-4 w-4" />
                New claim
              </Link>
            </Button>
          ) : undefined
        }
      />
      <ClaimsFilters />
      <ClaimsTable claims={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
