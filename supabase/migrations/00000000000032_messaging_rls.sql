-- =============================================================================
-- Module 15: Messaging
-- Migration 32: RLS policies. Uses the single messaging.use permission
-- already seeded in Module 1's permission catalog - unlike every other
-- module, there is no separate view/manage split, so messaging.use gates
-- reading, posting, and channel creation alike.
-- =============================================================================

alter table public.message_channels enable row level security;

create policy "message_channels_select_org"
  on public.message_channels for select
  using (organization_id = public.current_organization_id() and public.has_permission('messaging.use'));

create policy "message_channels_insert_org"
  on public.message_channels for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('messaging.use'));

alter table public.messages enable row level security;

create policy "messages_select_org"
  on public.messages for select
  using (organization_id = public.current_organization_id() and public.has_permission('messaging.use'));

create policy "messages_insert_org"
  on public.messages for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('messaging.use'));
