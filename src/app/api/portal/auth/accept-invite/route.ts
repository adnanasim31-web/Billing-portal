import { NextResponse } from "next/server";
import { patientPortalAcceptInviteSchema } from "@/lib/validations/patient-portal";
import { acceptPatientPortalInvite } from "@/lib/services/patient-portal-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patientPortalAcceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    await acceptPatientPortalInvite({ token: parsed.data.token, password: parsed.data.password });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to activate your account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
