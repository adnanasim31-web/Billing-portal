-- =============================================================================
-- Module 17: CRM
-- Migration 35: RLS policies. Uses the crm.view/crm.manage permissions
-- already seeded in Module 1's permission catalog - no RBAC migration
-- needed.
-- =============================================================================

alter table public.crm_leads enable row level security;

create policy "crm_leads_select_org"
  on public.crm_leads for select
  using (organization_id = public.current_organization_id() and public.has_permission('crm.view'));

create policy "crm_leads_write_org"
  on public.crm_leads for all
  using (organization_id = public.current_organization_id() and public.has_permission('crm.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.crm_activities enable row level security;

create policy "crm_activities_select_org"
  on public.crm_activities for select
  using (organization_id = public.current_organization_id() and public.has_permission('crm.view'));

create policy "crm_activities_insert_org"
  on public.crm_activities for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('crm.manage'));
