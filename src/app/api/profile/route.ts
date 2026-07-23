import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone || null,
      job_title: parsed.data.jobTitle || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await recordAuditLog({ userId: user.id, action: "user.profile_updated" });

  return NextResponse.json({ ok: true });
}
