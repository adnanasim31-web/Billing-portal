import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listCredentials } from "@/lib/services/credentialing-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { CredentialingFilters } from "@/components/credentialing/credentialing-filters";
import { CredentialingTable, type CredentialRow } from "@/components/credentialing/credentialing-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { CredentialStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Credentialing" };

interface CredentialingPageProps {
  searchParams: Promise<{ query?: string; status?: string; expiringSoon?: string; page?: string }>;
}

export default async function CredentialingPage({ searchParams }: CredentialingPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CREDENTIALING_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const status = (params.status as CredentialStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { credentials, total } = await listCredentials({
    organizationId: user.organizationId,
    query: params.query,
    status,
    expiringSoon: params.expiringSoon === "true",
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: CredentialRow[] = credentials.map((c) => ({
    id: c.id,
    providerId: c.provider_id,
    providerName: c.providers
      ? c.providers.provider_type === "organization"
        ? (c.providers.organization_name ?? "Unknown provider")
        : `${c.providers.first_name ?? ""} ${c.providers.last_name ?? ""}`.trim()
      : "Unknown provider",
    credentialType: c.credential_type,
    credentialNumber: c.credential_number,
    expirationDate: c.expiration_date,
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentialing"
        description={`${total} credentialing record${total === 1 ? "" : "s"} across all providers`}
      />
      <CredentialingFilters />
      <CredentialingTable credentials={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
