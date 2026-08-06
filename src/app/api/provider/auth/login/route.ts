import { NextResponse } from "next/server";
import { providerPortalLoginSchema } from "@/lib/validations/provider-portal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLoginAttempt } from "@/lib/services/auth-service";
import { markProviderPortalLogin } from "@/lib/services/provider-portal-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import { getRequestContext } from "@/lib/request-context";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = providerPortalLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const { ipAddress, userAgent } = await getRequestContext();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordLoginAttempt({ email, ipAddress, success: false, reason: "invalid_credentials" });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("provider_portal_accounts")
    .select("id, organization_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!account) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account doesn't have provider portal access" }, { status: 403 });
  }

  await recordLoginAttempt({ email, ipAddress, success: true });
  await markProviderPortalLogin(account.id);
  await recordAuditLog({
    organizationId: account.organization_id,
    userId: null,
    action: "provider_portal.login",
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
