"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_CATALOG } from "@/lib/constants/subscription-plans";
import { cn } from "@/lib/utils";
import type { BillingCycle, PlanTier } from "@/types/database.types";

const PLAN_ORDER: PlanTier[] = ["starter", "professional", "enterprise"];

export function PlanComparison({
  currentPlanTier,
  currentBillingCycle,
  canManage,
}: {
  currentPlanTier: PlanTier;
  currentBillingCycle: BillingCycle;
  canManage: boolean;
}) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>(currentBillingCycle);
  const [switchingTo, setSwitchingTo] = React.useState<PlanTier | null>(null);

  async function handleSwitch(tier: PlanTier) {
    setSwitchingTo(tier);
    try {
      const res = await fetch("/api/organization/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier, billingCycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to change plan");
        return;
      }
      toast.success(`Switched to the ${PLAN_CATALOG[tier].name} plan`);
      router.refresh();
    } finally {
      setSwitchingTo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={billingCycle === "monthly" ? "default" : "outline"}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </Button>
        <Button
          size="sm"
          variant={billingCycle === "annual" ? "default" : "outline"}
          onClick={() => setBillingCycle("annual")}
        >
          Annual (save ~17%)
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = PLAN_CATALOG[tier];
          const isCurrent = tier === currentPlanTier && billingCycle === currentBillingCycle;
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;

          return (
            <Card key={tier} className={cn(isCurrent && "border-primary")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="success">Current plan</Badge>}
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  ${price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {canManage && (
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || switchingTo !== null}
                    onClick={() => handleSwitch(tier)}
                  >
                    {switchingTo === tier && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCurrent ? "Current plan" : "Switch to this plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
