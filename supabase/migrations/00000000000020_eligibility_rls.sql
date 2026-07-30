-- =============================================================================
-- Module 8: Eligibility Verification
-- Migration 20: RLS policies. Uses the eligibility.view/eligibility.run
-- permissions already seeded in Module 1's permission catalog - no RBAC
-- migration needed.
-- =============================================================================

alter table public.eligibility_checks enable row level security;

create policy "eligibility_checks_select_org"
  on public.eligibility_checks for select
  using (organization_id = public.current_organization_id() and public.has_permission('eligibility.view'));

create policy "eligibility_checks_insert_org"
  on public.eligibility_checks for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('eligibility.run'));
