import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getOrganizationSubscription, changeSubscriptionPlan } from "@/lib/services/subscription-service";
import { changePlanSchema } from "@/lib/validations/subscription";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.SUBSCRIPTION_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the subscription" }, { status: 403 });
  }

  const subscription = await getOrganizationSubscription(user.organizationId);
  return NextResponse.json(subscription);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.SUBSCRIPTION_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to change the plan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const subscription = await changeSubscriptionPlan({
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(subscription);
}
