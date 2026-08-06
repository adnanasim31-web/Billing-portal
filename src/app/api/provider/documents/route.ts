import { NextResponse } from "next/server";
import {
  createProviderPortalDocument,
  getCurrentProviderPortalUser,
  getProviderPortalDocuments,
} from "@/lib/services/provider-portal-service";
import { getSignedDownloadUrl } from "@/lib/services/document-service";
import { providerPortalDocumentMetaSchema } from "@/lib/validations/provider-portal";

export async function GET() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const documents = await getProviderPortalDocuments(providerUser.providerId, providerUser.organizationId);
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return NextResponse.json(withUrls);
}

export async function POST(request: Request) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = providerPortalDocumentMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const document = await createProviderPortalDocument({
    providerId: providerUser.providerId,
    organizationId: providerUser.organizationId,
    input: parsed.data,
  });
  return NextResponse.json(document, { status: 201 });
}
