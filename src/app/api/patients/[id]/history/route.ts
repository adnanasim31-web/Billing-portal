import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listPatientHistory, addPatientHistoryEntry } from "@/lib/services/patient-history-service";
import { patientHistoryEntrySchema } from "@/lib/validations/patients";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view patients" }, { status: 403 });
  }

  const { id } = await params;
  const entries = await listPatientHistory(id, user.organizationId);
  return NextResponse.json(entries);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patientHistoryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const entry = await addPatientHistoryEntry({
    patientId: id,
    organizationId: user.organizationId,
    recordedBy: user.id,
    input: parsed.data,
  });

  return NextResponse.json(entry, { status: 201 });
}
