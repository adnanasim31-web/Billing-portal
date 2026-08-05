import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (user) {
    await recordAuditLog({ userId: null, action: "provider_portal.logout" });
  }

  return NextResponse.json({ ok: true });
}
