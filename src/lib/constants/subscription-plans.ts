import type { PlanTier } from "@/types/database.types";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  seatsIncluded: number;
  features: string[];
}

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 99,
    annualPrice: 990,
    seatsIncluded: 5,
    features: ["Up to 5 team seats", "Claims, Payments, Denials, AR", "Email support"],
  },
  professional: {
    tier: "professional",
    name: "Professional",
    monthlyPrice: 249,
    annualPrice: 2490,
    seatsIncluded: 15,
    features: ["Up to 15 team seats", "Everything in Starter", "Credentialing & Reports", "Priority support"],
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPrice: 599,
    annualPrice: 5990,
    seatsIncluded: 50,
    features: ["Up to 50 team seats", "Everything in Professional", "Custom onboarding", "Dedicated account manager"],
  },
};
