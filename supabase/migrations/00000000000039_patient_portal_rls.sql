-- =============================================================================
-- Patient Portal: RLS policies. Reuses the existing patients.view/patients.manage
-- permissions from Module 1's catalog for staff access - no RBAC migration
-- needed. Patient portal accounts have no roles/permissions of their own;
-- they may only ever select their own row, keyed by auth.uid().
-- =============================================================================

alter table public.patient_portal_invitations enable row level security;

create policy "patient_portal_invitations_select_org"
  on public.patient_portal_invitations for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patient_portal_invitations_write_org"
  on public.patient_portal_invitations for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.patient_portal_accounts enable row level security;

create policy "patient_portal_accounts_select_org"
  on public.patient_portal_accounts for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patient_portal_accounts_select_self"
  on public.patient_portal_accounts for select
  using (id = auth.uid());

create policy "patient_portal_accounts_write_org"
  on public.patient_portal_accounts for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());
