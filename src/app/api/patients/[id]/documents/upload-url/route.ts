import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { buildDocumentStoragePath, createSignedUploadUrl } from "@/lib/services/patient-document-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

const requestSchema = z.object({ fileName: z.string().min(1).max(255) });

/**
 * Issues a one-time signed upload URL scoped to this org/patient so the
 * browser can PUT the file straight to Supabase Storage without routing
 * bytes through this server.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to upload documents" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const path = buildDocumentStoragePath({
    organizationId: user.organizationId,
    patientId: id,
    fileName: parsed.data.fileName,
  });
  const signed = await createSignedUploadUrl(path);

  return NextResponse.json({ path, token: signed.token, signedUrl: signed.signedUrl });
}
