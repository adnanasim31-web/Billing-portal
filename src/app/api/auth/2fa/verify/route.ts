import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { otpSchema } from "@/lib/validations/auth";
import { verifyTwoFactorCode } from "@/lib/services/two-factor-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import { getRequestContext } from "@/lib/request-context";
import { signMfaCookieValue, MFA_COOKIE_NAME } from "@/lib/mfa-cookie";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = otpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { ipAddress, userAgent } = await getRequestContext();
  const isValid = await verifyTwoFactorCode(user.id, parsed.data.code);

  if (!isValid) {
    await recordAuditLog({
      userId: user.id,
      action: "auth.2fa_verify_failed",
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE_NAME, signMfaCookieValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await recordAuditLog({ userId: user.id, action: "auth.2fa_verified", ipAddress, userAgent });

  return NextResponse.json({ ok: true });
}
