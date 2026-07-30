-- =============================================================================
-- Module 15: Messaging
-- Migration 31: A simple internal message board - named channels (e.g.
-- "General", "Billing", "Front Desk") each holding a flat, chronological
-- list of messages. No threading/replies and no direct/1:1 conversations -
-- see the README for why this scope was chosen over a full chat product.
-- =============================================================================

create table public.message_channels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  description     text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint message_channels_org_name_unique unique (organization_id, name)
);

create index message_channels_organization_id_idx on public.message_channels (organization_id);

comment on table public.message_channels is 'Named internal message channels, scoped to one organization.';

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel_id      uuid not null references public.message_channels (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_organization_id_idx on public.messages (organization_id);
create index messages_channel_id_idx on public.messages (channel_id, created_at);

comment on table public.messages is 'Flat, chronological messages within a channel - no threading/replies.';
