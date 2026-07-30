import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listDocuments, createDocument } from "@/lib/services/document-service";
import { documentMetaSchema, documentSearchSchema } from "@/lib/validations/documents";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view documents" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = documentSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listDocuments({
    organizationId: user.organizationId,
    query: parsed.data.query,
    category: parsed.data.category,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to upload documents" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = documentMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const document = await createDocument({
    organizationId: user.organizationId,
    uploadedBy: user.id,
    input: parsed.data,
  });

  return NextResponse.json(document, { status: 201 });
}
