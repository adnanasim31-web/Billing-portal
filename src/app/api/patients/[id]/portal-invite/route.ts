import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { invitePatientToPortal } from "@/lib/services/patient-portal-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage patients" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { rawToken, email } = await invitePatientToPortal({
      patientId: id,
      organizationId: user.organizationId,
      invitedBy: user.id,
    });
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/accept-invite?token=${rawToken}`;
    return NextResponse.json({ inviteUrl, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to send portal invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
