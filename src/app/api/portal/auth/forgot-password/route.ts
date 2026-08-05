import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/portal/reset-password`;

  // Always resolve to 200 regardless of whether the email exists - avoids
  // leaking account existence to an unauthenticated caller.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  return NextResponse.json({ ok: true });
}
