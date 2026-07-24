-- =============================================================================
-- Modules 3 & 4: Providers, Insurance
-- Migration 10: RLS policies. Uses the providers.*/insurance.* permissions
-- already seeded in Module 1's permission catalog - no RBAC migration needed.
-- =============================================================================

alter table public.providers            enable row level security;
alter table public.provider_schedules   enable row level security;
alter table public.insurance_companies  enable row level security;

-- ---------------------------------------------------------------------------
-- providers
-- ---------------------------------------------------------------------------
create policy "providers_select_org"
  on public.providers for select
  using (organization_id = public.current_organization_id() and public.has_permission('providers.view'));

create policy "providers_write_org"
  on public.providers for all
  using (organization_id = public.current_organization_id() and public.has_permission('providers.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- provider_schedules
-- ---------------------------------------------------------------------------
create policy "provider_schedules_select_org"
  on public.provider_schedules for select
  using (organization_id = public.current_organization_id() and public.has_permission('providers.view'));

create policy "provider_schedules_write_org"
  on public.provider_schedules for all
  using (organization_id = public.current_organization_id() and public.has_permission('providers.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- insurance_companies
-- ---------------------------------------------------------------------------
create policy "insurance_companies_select_org"
  on public.insurance_companies for select
  using (organization_id = public.current_organization_id() and public.has_permission('insurance.view'));

create policy "insurance_companies_write_org"
  on public.insurance_companies for all
  using (organization_id = public.current_organization_id() and public.has_permission('insurance.manage'))
  with check (organization_id = public.current_organization_id());
