import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { updateAppointmentStatus } from "@/lib/services/appointment-service";
import { appointmentStatusSchema } from "@/lib/validations/appointments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit appointments" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = appointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const appointment = await updateAppointmentStatus({
    appointmentId: id,
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(appointment);
}
