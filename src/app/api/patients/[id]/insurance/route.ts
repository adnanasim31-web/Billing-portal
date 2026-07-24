import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listPatientInsurance, createPatientInsurance } from "@/lib/services/patient-insurance-service";
import { patientInsuranceSchema } from "@/lib/validations/patients";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view patients" }, { status: 403 });
  }

  const { id } = await params;
  const policies = await listPatientInsurance(id, user.organizationId);
  return NextResponse.json(policies);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patientInsuranceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const policy = await createPatientInsurance({
    patientId: id,
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(policy, { status: 201 });
}
