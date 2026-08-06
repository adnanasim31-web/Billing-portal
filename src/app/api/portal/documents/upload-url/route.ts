import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentPortalUser } from "@/lib/services/patient-portal-service";
import { buildDocumentStoragePath, createSignedUploadUrl } from "@/lib/services/patient-document-service";

const requestSchema = z.object({ fileName: z.string().min(1).max(255) });

/**
 * Issues a one-time signed upload URL scoped to this patient's own record so
 * the browser can PUT the file straight to Supabase Storage without routing
 * bytes through this server.
 */
export async function POST(request: Request) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const path = buildDocumentStoragePath({
    organizationId: portalUser.organizationId,
    patientId: portalUser.patientId,
    fileName: parsed.data.fileName,
  });
  const signed = await createSignedUploadUrl(path);

  return NextResponse.json({ path, token: signed.token, signedUrl: signed.signedUrl });
}
