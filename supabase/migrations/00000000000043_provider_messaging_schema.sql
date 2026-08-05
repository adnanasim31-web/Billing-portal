-- =============================================================================
-- Provider Portal: messaging between a provider and the billing office.
--
-- Deliberately NOT built on Module 15's message_channels/messages tables -
-- those model an org-wide, public bulletin board (any staff member with
-- messaging.use sees every channel) with messages.author_id hard-FK'd to
-- profiles(id). Neither property fits here: a provider's conversation with
-- billing must be private to that provider (not visible to every other
-- provider), and the sender is frequently a provider_portal_accounts row,
-- which is not a profiles row and would violate that FK on insert.
--
-- Instead this is a flat per-provider thread: every row for a given
-- provider_id *is* that provider's one conversation with the billing office,
-- ordered by created_at - no separate threads/participants table needed
-- since there is exactly one thread per provider by design.
-- =============================================================================

create table public.provider_messages (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations (id) on delete cascade,
  provider_id                 uuid not null references public.providers (id) on delete cascade,
  sender_type                 text not null check (sender_type in ('provider', 'staff')),
  sender_profile_id           uuid references public.profiles (id) on delete set null,
  sender_provider_account_id  uuid references public.provider_portal_accounts (id) on delete set null,
  body                        text not null,
  created_at                  timestamptz not null default now(),
  constraint provider_messages_sender_shape_check check (
    (sender_type = 'staff' and sender_profile_id is not null and sender_provider_account_id is null)
    or
    (sender_type = 'provider' and sender_provider_account_id is not null and sender_profile_id is null)
  )
);

create index provider_messages_provider_id_created_at_idx
  on public.provider_messages (provider_id, created_at);
create index provider_messages_organization_id_idx
  on public.provider_messages (organization_id);
