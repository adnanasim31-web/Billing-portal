import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildProviderPortalDocumentPath,
  createProviderPortalUploadUrl,
  getCurrentProviderPortalUser,
} from "@/lib/services/provider-portal-service";

const requestSchema = z.object({ fileName: z.string().min(1).max(255) });

/**
 * Issues a one-time signed upload URL scoped to this provider's own record
 * so the browser can PUT the file straight to Supabase Storage without
 * routing bytes through this server.
 */
export async function POST(request: Request) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const path = buildProviderPortalDocumentPath({
    organizationId: providerUser.organizationId,
    fileName: parsed.data.fileName,
  });
  const signed = await createProviderPortalUploadUrl(path);

  return NextResponse.json({ path, token: signed.token, signedUrl: signed.signedUrl });
}
