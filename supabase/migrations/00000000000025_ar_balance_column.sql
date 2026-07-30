-- =============================================================================
-- Module 11: Accounts Receivable
-- Migration 25: A generated balance_amount column on claims, so AR queries
-- can filter/sort/paginate "claims with an open balance" directly at the
-- database level via Postgrest, instead of fetching everything and
-- filtering in application code.
-- =============================================================================

alter table public.claims
  add column balance_amount numeric(12, 2)
  generated always as (total_charge_amount - total_paid_amount - total_adjustment_amount) stored;

create index claims_balance_amount_idx on public.claims (organization_id, balance_amount) where (balance_amount > 0);

comment on column public.claims.balance_amount is 'Generated: total_charge_amount - total_paid_amount - total_adjustment_amount. The open balance an AR work queue tracks.';
