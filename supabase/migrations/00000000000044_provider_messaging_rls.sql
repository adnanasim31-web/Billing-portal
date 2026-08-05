-- =============================================================================
-- Provider Portal messaging: RLS policies. Staff access reuses the existing
-- providers.view/providers.manage permissions (no new permission needed);
-- a provider portal account may only see and post into its own provider's
-- thread, keyed by auth.uid() against provider_portal_accounts.
-- =============================================================================

alter table public.provider_messages enable row level security;

create policy "provider_messages_select_org"
  on public.provider_messages for select
  using (organization_id = public.current_organization_id() and public.has_permission('providers.view'));

create policy "provider_messages_select_own_thread"
  on public.provider_messages for select
  using (
    exists (
      select 1 from public.provider_portal_accounts ppa
      where ppa.id = auth.uid() and ppa.provider_id = provider_messages.provider_id
    )
  );

create policy "provider_messages_insert_staff"
  on public.provider_messages for insert
  with check (
    sender_type = 'staff'
    and organization_id = public.current_organization_id()
    and public.has_permission('providers.manage')
  );

create policy "provider_messages_insert_provider"
  on public.provider_messages for insert
  with check (
    sender_type = 'provider'
    and exists (
      select 1 from public.provider_portal_accounts ppa
      where ppa.id = auth.uid()
        and ppa.provider_id = provider_messages.provider_id
        and ppa.organization_id = provider_messages.organization_id
    )
  );
