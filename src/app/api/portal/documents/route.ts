import { NextResponse } from "next/server";
import { getCurrentPortalUser } from "@/lib/services/patient-portal-service";
import {
  listPatientDocuments,
  recordPatientDocument,
  getSignedDownloadUrl,
} from "@/lib/services/patient-document-service";
import { patientDocumentMetaSchema } from "@/lib/validations/patients";

export async function GET() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const documents = await listPatientDocuments(portalUser.patientId, portalUser.organizationId);

  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return NextResponse.json(withUrls);
}

export async function POST(request: Request) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patientDocumentMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const document = await recordPatientDocument({
    patientId: portalUser.patientId,
    organizationId: portalUser.organizationId,
    uploadedBy: null,
    input: parsed.data,
  });

  return NextResponse.json(document, { status: 201 });
}
