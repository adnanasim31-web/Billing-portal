import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await recordAuditLog({ userId: user.id, action: "auth.password_changed" });

  return NextResponse.json({ ok: true });
}
