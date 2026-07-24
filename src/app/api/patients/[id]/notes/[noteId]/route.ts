import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { togglePatientNotePin, deletePatientNote } from "@/lib/services/patient-notes-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

const patchSchema = z.object({ isPinned: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { noteId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  await togglePatientNotePin({
    noteId,
    organizationId: user.organizationId,
    isPinned: parsed.data.isPinned,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to edit patients" }, { status: 403 });
  }

  const { noteId } = await params;
  await deletePatientNote({
    noteId,
    organizationId: user.organizationId,
    actingUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
