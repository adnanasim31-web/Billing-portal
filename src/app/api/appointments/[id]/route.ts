import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getAppointmentById, updateAppointment } from "@/lib/services/appointment-service";
import { appointmentSchema } from "@/lib/validations/appointments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view appointments" }, { status: 403 });
  }

  const { id } = await params;
  const appointment = await getAppointmentById(id, user.organizationId);
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  return NextResponse.json(appointment);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit appointments" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const appointment = await updateAppointment({
      appointmentId: id,
      organizationId: user.organizationId,
      updatedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update appointment" },
      { status: 400 }
    );
  }
}
