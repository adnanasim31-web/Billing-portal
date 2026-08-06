import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPortalUser } from "@/lib/services/patient-portal-service";
import { listPatientDocuments, getSignedDownloadUrl } from "@/lib/services/patient-document-service";
import { PortalDocuments } from "@/components/portal/portal-documents";

export const metadata: Metadata = { title: "My Documents" };

export default async function PortalDocumentsPage() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const documents = await listPatientDocuments(portalUser.patientId, portalUser.organizationId);
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      category: doc.category,
      createdAt: doc.created_at,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground">
          View documents shared by your provider&apos;s billing office, or upload your own (like an
          insurance card).
        </p>
      </div>

      <PortalDocuments documents={withUrls} />
    </div>
  );
}
