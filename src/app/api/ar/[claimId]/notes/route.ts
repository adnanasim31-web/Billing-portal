import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listArNotesForClaim, addArNote } from "@/lib/services/ar-service";
import { arNoteSchema } from "@/lib/validations/ar";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.AR_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view accounts receivable" }, { status: 403 });
  }

  const { claimId } = await params;
  const notes = await listArNotesForClaim(claimId, user.organizationId);
  return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.AR_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage accounts receivable" }, { status: 403 });
  }

  const { claimId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = arNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const note = await addArNote({
    claimId,
    organizationId: user.organizationId,
    authorId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(note, { status: 201 });
}
