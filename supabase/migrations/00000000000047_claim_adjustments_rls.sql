-- =============================================================================
-- Claim adjustments RLS. Select follows claims.view (same visibility as the
-- claim itself); insert requires payments.post - financially, posting a
-- write-off/adjustment is the same class of action as posting a payment
-- (both change claim_lines.adjustment_amount/paid_amount), so it reuses that
-- permission rather than introducing a new slug.
-- =============================================================================

alter table public.claim_adjustments enable row level security;

create policy "claim_adjustments_select_org"
  on public.claim_adjustments for select
  using (organization_id = public.current_organization_id() and public.has_permission('claims.view'));

create policy "claim_adjustments_insert_org"
  on public.claim_adjustments for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('payments.post'));
