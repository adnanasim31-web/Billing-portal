-- =============================================================================
-- Payment refunds RLS. Select follows payments.view; insert requires
-- payments.post - issuing a refund is financially the same class of action
-- as posting a payment (both change claim_lines.paid_amount), so it reuses
-- that permission rather than introducing a new slug, matching
-- claim_adjustments' own precedent. No update/delete policies - refunds are
-- an immutable append-only log, same as payments/payment_allocations.
-- =============================================================================

alter table public.payment_refunds enable row level security;

create policy "payment_refunds_select_org"
  on public.payment_refunds for select
  using (organization_id = public.current_organization_id() and public.has_permission('payments.view'));

create policy "payment_refunds_insert_org"
  on public.payment_refunds for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('payments.post'));
