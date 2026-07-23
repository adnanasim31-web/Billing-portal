import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";
import { MFA_COOKIE_NAME } from "@/lib/mfa-cookie";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(MFA_COOKIE_NAME);

  if (user) {
    await recordAuditLog({ userId: user.id, action: "auth.logout" });
  }

  return NextResponse.json({ ok: true });
}
