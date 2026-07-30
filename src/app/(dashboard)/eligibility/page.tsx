import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listEligibilityChecks } from "@/lib/services/eligibility-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EligibilityFilters } from "@/components/eligibility/eligibility-filters";
import { EligibilityTable, type EligibilityRow } from "@/components/eligibility/eligibility-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { EligibilityStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Eligibility" };

interface EligibilityPageProps {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}

export default async function EligibilityPage({ searchParams }: EligibilityPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const status = (params.status as EligibilityStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { checks, total } = await listEligibilityChecks({
    organizationId: user.organizationId,
    query: params.query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: EligibilityRow[] = checks.map((c) => ({
    id: c.id,
    patientName: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown patient",
    patientMrn: c.patients?.mrn ?? "",
    payerName: c.payer_name,
    status: c.status,
    checkedAt: c.checked_at,
  }));

  const canRun = hasPermission(user, PERMISSIONS.ELIGIBILITY_RUN);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eligibility"
        description={`${total} check${total === 1 ? "" : "s"} on record`}
        action={
          canRun ? (
            <Button asChild>
              <Link href="/eligibility/new">
                <BadgeCheck className="h-4 w-4" />
                Run a check
              </Link>
            </Button>
          ) : undefined
        }
      />
      <EligibilityFilters />
      <EligibilityTable checks={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
