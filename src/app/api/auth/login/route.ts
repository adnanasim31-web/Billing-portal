import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getLockoutStatus,
  handleFailedLogin,
  handleSuccessfulLogin,
  recordLoginAttempt,
  requiresTwoFactor,
} from "@/lib/services/auth-service";
import { upsertSessionRecord } from "@/lib/services/session-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import { getRequestContext } from "@/lib/request-context";
import { signMfaCookieValue, MFA_COOKIE_NAME } from "@/lib/mfa-cookie";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const { ipAddress, userAgent } = await getRequestContext();

  const lockout = await getLockoutStatus(email);
  if (lockout.isLocked) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 423 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    await handleFailedLogin(email);
    await recordLoginAttempt({ email, ipAddress, success: false, reason: "invalid_credentials" });
    await recordAuditLog({ action: "auth.login_failed", metadata: { email }, ipAddress, userAgent });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await handleSuccessfulLogin({ userId: data.user.id, ipAddress });
  await recordLoginAttempt({ email, ipAddress, success: true });

  await upsertSessionRecord({
    userId: data.user.id,
    refreshTokenId: data.session.refresh_token,
    ipAddress,
    userAgent,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", data.user.id)
    .single();

  await recordAuditLog({
    organizationId: profile?.organization_id ?? null,
    userId: data.user.id,
    action: "auth.login",
    ipAddress,
    userAgent,
  });

  const needsTwoFactor = await requiresTwoFactor(data.user.id);
  const cookieStore = await cookies();

  if (needsTwoFactor) {
    cookieStore.delete(MFA_COOKIE_NAME);
    return NextResponse.json({ requiresTwoFactor: true });
  }

  cookieStore.set(MFA_COOKIE_NAME, signMfaCookieValue(data.user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ requiresTwoFactor: false });
}
