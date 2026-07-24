import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listInsuranceCompanies } from "@/lib/services/insurance-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InsuranceSearch } from "@/components/insurance/insurance-search";
import { InsuranceCompaniesTable, type InsuranceCompanyRow } from "@/components/insurance/insurance-companies-table";
import { ServerPagination } from "@/components/shared/server-pagination";

export const metadata: Metadata = { title: "Insurance" };

const PAGE_SIZE = 20;

interface InsurancePageProps {
  searchParams: Promise<{ query?: string; page?: string }>;
}

export default async function InsurancePage({ searchParams }: InsurancePageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.INSURANCE_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const { companies, total } = await listInsuranceCompanies({
    organizationId: user.organizationId,
    query: params.query,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: InsuranceCompanyRow[] = companies.map((c) => ({
    id: c.id,
    name: c.name,
    payerIdCode: c.payer_id_code,
    phone: c.phone,
    isActive: c.is_active,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance"
        description={`${total} payer${total === 1 ? "" : "s"} in your directory`}
        action={
          <Button asChild>
            <Link href="/insurance/new">
              <Plus className="h-4 w-4" />
              Add payer
            </Link>
          </Button>
        }
      />
      <InsuranceSearch />
      <InsuranceCompaniesTable companies={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
