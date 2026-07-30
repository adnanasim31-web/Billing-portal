-- =============================================================================
-- Module 16: Billing & Plan
-- Migration 33: Extends the existing organizations table (Module 1 already
-- has trial_ends_at/is_active) with plan/subscription fields. No new
-- table - an organization has exactly one subscription, so it belongs on
-- the row itself rather than a separate one-to-one table.
-- =============================================================================

alter table public.organizations
  add column plan_tier text not null default 'starter'
    check (plan_tier in ('starter', 'professional', 'enterprise')),
  add column billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual')),
  add column seats_included integer not null default 5,
  add column subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));

comment on column public.organizations.plan_tier is 'Current subscription tier - starter/professional/enterprise.';
comment on column public.organizations.subscription_status is 'Trialing/active/past_due/canceled - no real payment processor is wired up (see README), so this only ever reflects the demo plan-switch action.';
