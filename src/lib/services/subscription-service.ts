import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { PLAN_CATALOG } from "@/lib/constants/subscription-plans";
import type { ChangePlanInput } from "@/lib/validations/subscription";

const SUBSCRIPTION_SELECT = "id, name, plan_tier, billing_cycle, seats_included, subscription_status, trial_ends_at, is_active";

export async function getOrganizationSubscription(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations").select(SUBSCRIPTION_SELECT).eq("id", organizationId).single();
  if (error) throw error;
  return data;
}

export async function changeSubscriptionPlan(params: {
  organizationId: string;
  actingUserId: string;
  input: ChangePlanInput;
}) {
  const admin = createAdminClient();
  const plan = PLAN_CATALOG[params.input.planTier];

  const { data, error } = await admin
    .from("organizations")
    .update({
      plan_tier: params.input.planTier,
      billing_cycle: params.input.billingCycle,
      seats_included: plan.seatsIncluded,
      subscription_status: "active",
    })
    .eq("id", params.organizationId)
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "subscription.plan_changed",
    entityType: "organization",
    entityId: params.organizationId,
    metadata: { planTier: params.input.planTier, billingCycle: params.input.billingCycle },
  });

  return data;
}
