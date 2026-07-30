-- =============================================================================
-- Module 7: Claims
-- Migration 18: RLS policies. Uses the claims.view/claims.manage permissions
-- already seeded in Module 1's permission catalog - no RBAC migration needed.
-- Submit/appeal actions are additionally gated in the application layer via
-- claims.submit/claims.appeal (see claim-service.ts), since those are
-- state-transition actions rather than distinct row-level access patterns.
-- =============================================================================

alter table public.claims enable row level security;

create policy "claims_select_org"
  on public.claims for select
  using (organization_id = public.current_organization_id() and public.has_permission('claims.view'));

create policy "claims_write_org"
  on public.claims for all
  using (organization_id = public.current_organization_id() and public.has_permission('claims.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.claim_diagnoses enable row level security;

create policy "claim_diagnoses_select_org"
  on public.claim_diagnoses for select
  using (organization_id = public.current_organization_id() and public.has_permission('claims.view'));

create policy "claim_diagnoses_write_org"
  on public.claim_diagnoses for all
  using (organization_id = public.current_organization_id() and public.has_permission('claims.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.claim_lines enable row level security;

create policy "claim_lines_select_org"
  on public.claim_lines for select
  using (organization_id = public.current_organization_id() and public.has_permission('claims.view'));

create policy "claim_lines_write_org"
  on public.claim_lines for all
  using (organization_id = public.current_organization_id() and public.has_permission('claims.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.claim_status_history enable row level security;

create policy "claim_status_history_select_org"
  on public.claim_status_history for select
  using (organization_id = public.current_organization_id() and public.has_permission('claims.view'));

create policy "claim_status_history_write_org"
  on public.claim_status_history for all
  using (organization_id = public.current_organization_id() and public.has_permission('claims.manage'))
  with check (organization_id = public.current_organization_id());
