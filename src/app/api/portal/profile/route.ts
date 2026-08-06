import { NextResponse } from "next/server";
import { patientPortalProfileSchema } from "@/lib/validations/patient-portal";
import { getCurrentPortalUser, getPortalProfile, updatePortalProfile } from "@/lib/services/patient-portal-service";

export async function GET() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getPortalProfile(portalUser.patientId, portalUser.organizationId);
  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patientPortalProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const profile = await updatePortalProfile(portalUser.patientId, portalUser.organizationId, parsed.data);
  return NextResponse.json(profile);
}
