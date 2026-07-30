import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listDocuments } from "@/lib/services/document-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentsFilters } from "@/components/documents/documents-filters";
import { DocumentsList, type DocumentRow } from "@/components/documents/documents-list";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { OrgDocumentCategory } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Documents" };

interface DocumentsPageProps {
  searchParams: Promise<{ query?: string; category?: string; page?: string }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const category = (params.category as OrgDocumentCategory | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { documents, total } = await listDocuments({
    organizationId: user.organizationId,
    query: params.query,
    category,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    fileName: d.file_name,
    fileSize: d.file_size,
    category: d.category,
    version: d.version,
    uploadedByName: d.profiles ? `${d.profiles.first_name} ${d.profiles.last_name}` : "Unknown",
    createdAt: d.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description={`${total} document${total === 1 ? "" : "s"} on file`}
      />
      <DocumentsFilters />
      <DocumentsList documents={rows} canManage={hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
