import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getOrganizationSubscription } from "@/lib/services/subscription-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { PLAN_CATALOG } from "@/lib/constants/subscription-plans";

export const metadata: Metadata = { title: "Billing & Plan" };

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.SUBSCRIPTION_VIEW)) redirect("/dashboard");

  const subscription = await getOrganizationSubscription(user.organizationId);
  const plan = PLAN_CATALOG[subscription.plan_tier];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plan" description="Manage your organization's subscription tier." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="mt-0.5 text-sm font-medium">{plan.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing cycle</p>
            <p className="mt-0.5 text-sm capitalize">{subscription.billing_cycle}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seats included</p>
            <p className="mt-0.5 text-sm">{subscription.seats_included}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <Badge variant={subscription.subscription_status === "active" ? "success" : "warning"}>
              {SUBSCRIPTION_STATUS_LABELS[subscription.subscription_status]}
            </Badge>
          </div>
          {subscription.trial_ends_at && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trial ends</p>
              <p className="mt-0.5 text-sm">{new Date(subscription.trial_ends_at).toLocaleDateString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Demo mode: switching plans here updates your organization&apos;s tier immediately - no payment is
        processed and no card is charged.
      </p>

      <PlanComparison
        currentPlanTier={subscription.plan_tier}
        currentBillingCycle={subscription.billing_cycle}
        canManage={hasPermission(user, PERMISSIONS.SUBSCRIPTION_MANAGE)}
      />
    </div>
  );
}
