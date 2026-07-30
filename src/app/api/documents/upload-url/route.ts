import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { buildDocumentStoragePath, createSignedUploadUrl } from "@/lib/services/document-service";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/documents";
import { PERMISSIONS } from "@/lib/constants/permissions";

const requestSchema = z.object({
  fileName: z.string().min(1).max(255),
  category: z.enum(DOCUMENT_CATEGORIES).default("other"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to upload documents" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const path = buildDocumentStoragePath({
    organizationId: user.organizationId,
    category: parsed.data.category,
    fileName: parsed.data.fileName,
  });
  const signed = await createSignedUploadUrl(path);

  return NextResponse.json({ path, token: signed.token, signedUrl: signed.signedUrl });
}
