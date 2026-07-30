-- =============================================================================
-- Module 13: Credentialing
-- Migration 28: RLS policies. Uses the credentialing.view/credentialing.manage
-- permissions already seeded in Module 1's permission catalog - no RBAC
-- migration needed.
-- =============================================================================

alter table public.provider_credentials enable row level security;

create policy "provider_credentials_select_org"
  on public.provider_credentials for select
  using (organization_id = public.current_organization_id() and public.has_permission('credentialing.view'));

create policy "provider_credentials_write_org"
  on public.provider_credentials for all
  using (organization_id = public.current_organization_id() and public.has_permission('credentialing.manage'))
  with check (organization_id = public.current_organization_id());
