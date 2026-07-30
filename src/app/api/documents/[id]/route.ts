import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { deleteDocument, getSignedDownloadUrl } from "@/lib/services/document-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view documents" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("organization_id", user.organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const signedUrl = await getSignedDownloadUrl(doc.file_path);
  return NextResponse.json({ signedUrl });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to delete documents" }, { status: 403 });
  }

  const { id } = await params;
  await deleteDocument({ documentId: id, organizationId: user.organizationId, actingUserId: user.id });
  return NextResponse.json({ ok: true });
}
