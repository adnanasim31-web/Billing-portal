import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listAppointments, createAppointment } from "@/lib/services/appointment-service";
import { appointmentSchema, appointmentSearchSchema } from "@/lib/validations/appointments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view appointments" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = appointmentSearchSchema.safeParse({
    date: url.searchParams.get("date") ?? undefined,
    providerId: url.searchParams.get("providerId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const appointments = await listAppointments({
    organizationId: user.organizationId,
    date: parsed.data.date,
    providerId: parsed.data.providerId || undefined,
    status: parsed.data.status,
  });

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to schedule appointments" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const appointment = await createAppointment({
      organizationId: user.organizationId,
      createdBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to schedule appointment" },
      { status: 400 }
    );
  }
}
