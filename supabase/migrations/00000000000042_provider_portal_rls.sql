-- =============================================================================
-- Provider Portal: RLS policies. Reuses the existing providers.view/
-- providers.manage permissions from Module 1's catalog for staff access - no
-- RBAC migration needed. Provider portal accounts have no roles/permissions
-- of their own; they may only ever select their own row, keyed by auth.uid().
-- =============================================================================

alter table public.provider_portal_accounts enable row level security;

create policy "provider_portal_accounts_select_org"
  on public.provider_portal_accounts for select
  using (organization_id = public.current_organization_id() and public.has_permission('providers.view'));

create policy "provider_portal_accounts_select_self"
  on public.provider_portal_accounts for select
  using (id = auth.uid());

create policy "provider_portal_accounts_write_org"
  on public.provider_portal_accounts for all
  using (organization_id = public.current_organization_id() and public.has_permission('providers.manage'))
  with check (organization_id = public.current_organization_id());
