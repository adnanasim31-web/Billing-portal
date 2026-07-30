import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listLeads } from "@/lib/services/crm-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LeadsFilters } from "@/components/crm/leads-filters";
import { LeadsTable, type LeadRow } from "@/components/crm/leads-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { CrmLeadStage } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "CRM" };

interface CrmPageProps {
  searchParams: Promise<{ query?: string; stage?: string; page?: string }>;
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CRM_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const stage = (params.stage as CrmLeadStage | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { leads, total } = await listLeads({
    organizationId: user.organizationId,
    query: params.query,
    stage,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    contactName: l.contact_name,
    companyName: l.company_name,
    stage: l.stage,
    estimatedValue: l.estimated_value !== null ? Number(l.estimated_value) : null,
    ownerName: l.profiles ? `${l.profiles.first_name} ${l.profiles.last_name}` : null,
  }));

  const canManage = hasPermission(user, PERMISSIONS.CRM_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description={`${total} lead${total === 1 ? "" : "s"} in the pipeline`}
        action={
          canManage ? (
            <Button asChild>
              <Link href="/crm/new">
                <UserPlus className="h-4 w-4" />
                Add lead
              </Link>
            </Button>
          ) : undefined
        }
      />
      <LeadsFilters />
      <LeadsTable leads={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
