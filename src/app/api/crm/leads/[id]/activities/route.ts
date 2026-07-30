import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listActivitiesForLead, addActivity } from "@/lib/services/crm-service";
import { crmActivitySchema } from "@/lib/validations/crm";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the CRM" }, { status: 403 });
  }

  const { id } = await params;
  const activities = await listActivitiesForLead(id, user.organizationId);
  return NextResponse.json(activities);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage the CRM" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = crmActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const activity = await addActivity({
    leadId: id,
    organizationId: user.organizationId,
    authorId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(activity, { status: 201 });
}
