import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import {
  listPatientDocuments,
  recordPatientDocument,
  getSignedDownloadUrl,
} from "@/lib/services/patient-document-service";
import { patientDocumentMetaSchema } from "@/lib/validations/patients";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view documents" }, { status: 403 });
  }

  const { id } = await params;
  const documents = await listPatientDocuments(id, user.organizationId);

  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return NextResponse.json(withUrls);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to upload documents" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patientDocumentMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const document = await recordPatientDocument({
    patientId: id,
    organizationId: user.organizationId,
    uploadedBy: user.id,
    input: parsed.data,
  });

  return NextResponse.json(document, { status: 201 });
}
