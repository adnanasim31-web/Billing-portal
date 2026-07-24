import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listPatients, createPatient } from "@/lib/services/patient-service";
import { patientSchema, patientSearchSchema } from "@/lib/validations/patients";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view patients" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = patientSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const result = await listPatients({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    page: parsed.data.page,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to register patients" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const patient = await createPatient({
    organizationId: user.organizationId,
    createdBy: user.id,
    input: parsed.data,
  });

  return NextResponse.json(patient, { status: 201 });
}
