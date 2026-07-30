import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getLeadById, updateLead } from "@/lib/services/crm-service";
import { crmLeadSchema } from "@/lib/validations/crm";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the CRM" }, { status: 403 });
  }

  const { id } = await params;
  const lead = await getLeadById(id, user.organizationId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json(lead);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage the CRM" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = crmLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const lead = await updateLead({
      leadId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update lead" },
      { status: 400 }
    );
  }
}
