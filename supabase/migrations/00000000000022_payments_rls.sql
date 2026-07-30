-- =============================================================================
-- Module 9: Payment Posting
-- Migration 22: RLS policies. Uses the payments.view/payments.post
-- permissions already seeded in Module 1's permission catalog - no RBAC
-- migration needed. No update/delete policies - posted payments and their
-- allocations are treated as an immutable audit trail, same as claim_status_
-- history and eligibility_checks; a correction is a new payment/allocation.
-- =============================================================================

alter table public.payments enable row level security;

create policy "payments_select_org"
  on public.payments for select
  using (organization_id = public.current_organization_id() and public.has_permission('payments.view'));

create policy "payments_insert_org"
  on public.payments for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('payments.post'));

alter table public.payment_allocations enable row level security;

create policy "payment_allocations_select_org"
  on public.payment_allocations for select
  using (organization_id = public.current_organization_id() and public.has_permission('payments.view'));

create policy "payment_allocations_insert_org"
  on public.payment_allocations for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('payments.post'));
