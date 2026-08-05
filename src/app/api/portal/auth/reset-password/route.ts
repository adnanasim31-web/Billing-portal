import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";

/**
 * Called after the patient lands on /portal/reset-password from the emailed
 * recovery link - Supabase's recovery link already exchanges itself for a
 * short-lived session, so this just updates the password on that session.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Your reset link has expired. Please request a new one." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await recordAuditLog({ userId: user.id, action: "patient_portal.password_reset" });

  return NextResponse.json({ ok: true });
}
