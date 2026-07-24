import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPatientById, updatePatient } from "@/lib/services/patient-service";
import { patientSchema } from "@/lib/validations/patients";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view patients" }, { status: 403 });
  }

  const { id } = await params;
  const patient = await getPatientById(id, user.organizationId);
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  return NextResponse.json(patient);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const patient = await updatePatient({
    patientId: id,
    organizationId: user.organizationId,
    updatedBy: user.id,
    input: parsed.data,
  });

  return NextResponse.json(patient);
}
