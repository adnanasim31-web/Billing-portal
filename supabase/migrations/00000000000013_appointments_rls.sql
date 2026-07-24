-- =============================================================================
-- Module 5: Appointments
-- Migration 13: RLS policies. Uses the appointments.* permissions already
-- seeded in Module 1's permission catalog - no RBAC migration needed.
-- =============================================================================

alter table public.appointments enable row level security;

create policy "appointments_select_org"
  on public.appointments for select
  using (organization_id = public.current_organization_id() and public.has_permission('appointments.view'));

create policy "appointments_write_org"
  on public.appointments for all
  using (organization_id = public.current_organization_id() and public.has_permission('appointments.manage'))
  with check (organization_id = public.current_organization_id());
