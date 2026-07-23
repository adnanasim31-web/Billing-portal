import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { twoFactorSetupVerifySchema } from "@/lib/validations/auth";
import { confirmTwoFactorSetup } from "@/lib/services/two-factor-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import { signMfaCookieValue, MFA_COOKIE_NAME } from "@/lib/mfa-cookie";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = twoFactorSetupVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const success = await confirmTwoFactorSetup(user.id, parsed.data.code);
  if (!success) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  await recordAuditLog({
    organizationId: profile?.organization_id ?? null,
    userId: user.id,
    action: "auth.2fa_enabled",
  });

  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE_NAME, signMfaCookieValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
