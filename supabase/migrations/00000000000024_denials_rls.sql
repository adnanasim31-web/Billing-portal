-- =============================================================================
-- Module 10: Denial Management
-- Migration 24: RLS policies. Uses the denials.view/denials.manage
-- permissions already seeded in Module 1's permission catalog - no RBAC
-- migration needed.
-- =============================================================================

alter table public.claim_denials enable row level security;

create policy "claim_denials_select_org"
  on public.claim_denials for select
  using (organization_id = public.current_organization_id() and public.has_permission('denials.view'));

create policy "claim_denials_write_org"
  on public.claim_denials for all
  using (organization_id = public.current_organization_id() and public.has_permission('denials.manage'))
  with check (organization_id = public.current_organization_id());
