import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disableTwoFactor } from "@/lib/services/two-factor-service";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await disableTwoFactor(user.id);
  await recordAuditLog({ userId: user.id, action: "auth.2fa_disabled" });

  return NextResponse.json({ ok: true });
}
