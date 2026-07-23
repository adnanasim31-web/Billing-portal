import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeSession } from "@/lib/services/session-service";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  await revokeSession(id, user.id);
  await recordAuditLog({ userId: user.id, action: "auth.session_revoked", entityId: id });

  return NextResponse.json({ ok: true });
}
