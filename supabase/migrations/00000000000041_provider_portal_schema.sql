-- =============================================================================
-- Provider Portal: external, non-staff login for rendering providers to view
-- their own appointment schedule, claims, and credentialing status - separate
-- from the profiles/user_roles RBAC system used by staff, same "own auth.users
-- row -> exactly one <entity> row" shape as the Patient Portal. Unlike the
-- Patient Portal, there is no invitation/token flow here: staff sets the
-- provider's email and password directly on the provider's profile, so the
-- account is active immediately.
-- =============================================================================

create table public.provider_portal_accounts (
  id                uuid primary key references auth.users (id) on delete cascade,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  provider_id       uuid not null unique references public.providers (id) on delete cascade,
  email             citext not null,
  set_by            uuid references public.profiles (id) on delete set null,
  last_login_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index provider_portal_accounts_organization_id_idx on public.provider_portal_accounts (organization_id);

comment on table public.provider_portal_accounts is 'Links an auth.users row to exactly one providers row - the provider-facing counterpart to profiles for staff. Credentials are set directly by staff (email + password), not via an emailed invite link.';

create trigger provider_portal_accounts_set_updated_at
  before update on public.provider_portal_accounts
  for each row execute function public.set_updated_at();
