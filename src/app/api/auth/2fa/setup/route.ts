import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { beginTwoFactorSetup } from "@/lib/services/two-factor-service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const setup = await beginTwoFactorSetup(user.id, user.email!);
  return NextResponse.json(setup);
}
