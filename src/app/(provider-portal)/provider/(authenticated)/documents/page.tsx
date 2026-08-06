import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalDocuments } from "@/lib/services/provider-portal-service";
import { getSignedDownloadUrl } from "@/lib/services/document-service";
import { ProviderPortalDocumentsTab } from "@/components/provider-portal/provider-portal-documents-tab";

export const metadata: Metadata = { title: "Documents" };

export default async function ProviderDocumentsPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const documents = await getProviderPortalDocuments(providerUser.providerId, providerUser.organizationId);
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      createdAt: doc.created_at,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground">Your credentialing documents on file with the billing office.</p>
      </div>

      <ProviderPortalDocumentsTab documents={withUrls} />
    </div>
  );
}
