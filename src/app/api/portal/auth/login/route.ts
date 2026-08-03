import { NextResponse } from "next/server";
import { patientPortalLoginSchema } from "@/lib/validations/patient-portal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLoginAttempt } from "@/lib/services/auth-service";
import { markPortalLogin } from "@/lib/services/patient-portal-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import { getRequestContext } from "@/lib/request-context";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patientPortalLoginSchema.safeParse(body);
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
    .from("patient_portal_accounts")
    .select("id, organization_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!account) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account doesn't have patient portal access" }, { status: 403 });
  }

  await recordLoginAttempt({ email, ipAddress, success: true });
  await markPortalLogin(account.id);
  await recordAuditLog({
    organizationId: account.organization_id,
    userId: account.id,
    action: "patient_portal.login",
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
