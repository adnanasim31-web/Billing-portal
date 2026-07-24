import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listProviders } from "@/lib/services/provider-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProvidersFilters } from "@/components/providers/providers-filters";
import { ProvidersTable, type ProviderRow } from "@/components/providers/providers-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { ProviderStatus } from "@/types/database.types";

export const metadata: Metadata = { title: "Providers" };

const PAGE_SIZE = 20;

interface ProvidersPageProps {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}

export default async function ProvidersPage({ searchParams }: ProvidersPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const status = (params.status as ProviderStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { providers, total } = await listProviders({
    organizationId: user.organizationId,
    query: params.query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: ProviderRow[] = providers.map((p) => ({
    id: p.id,
    providerType: p.provider_type,
    displayName:
      p.provider_type === "organization"
        ? p.organization_name ?? "Unnamed organization"
        : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
    npi: p.npi,
    specialty: p.specialty,
    phone: p.phone,
    email: p.email,
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        description={`${total} provider${total === 1 ? "" : "s"} on the roster`}
        action={
          <Button asChild>
            <Link href="/providers/new">
              <UserPlus className="h-4 w-4" />
              Add provider
            </Link>
          </Button>
        }
      />
      <ProvidersFilters />
      <ProvidersTable providers={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
