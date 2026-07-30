import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listLeads, createLead } from "@/lib/services/crm-service";
import { crmLeadSchema, crmSearchSchema } from "@/lib/validations/crm";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the CRM" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = crmSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listLeads({
    organizationId: user.organizationId,
    query: parsed.data.query,
    stage: parsed.data.stage,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage the CRM" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = crmLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const lead = await createLead({
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(lead, { status: 201 });
}
