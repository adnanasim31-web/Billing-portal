-- =============================================================================
-- Module 1: Authentication & User Management
-- Migration 1: Core tenancy, profiles, and RBAC schema
-- =============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger function (reused by every table below)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations: the tenant. A "practice" / billing company using the suite.
-- ---------------------------------------------------------------------------
create table public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  npi                varchar(10),
  tax_id             varchar(20),
  logo_url           text,
  phone              text,
  billing_email      citext,
  address_line1      text,
  address_line2      text,
  city               text,
  state              varchar(2),
  postal_code        varchar(10),
  timezone           text not null default 'America/New_York',
  is_active          boolean not null default true,
  trial_ends_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create index organizations_slug_idx on public.organizations (slug);
create index organizations_is_active_idx on public.organizations (is_active);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

comment on table public.organizations is 'Tenant root: a billing company / medical practice group.';

-- ---------------------------------------------------------------------------
-- profiles: 1:1 extension of auth.users. Holds app-level identity + status.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  organization_id       uuid references public.organizations (id) on delete set null,
  email                 citext not null unique,
  first_name            text not null,
  last_name             text not null,
  phone                 text,
  avatar_url            text,
  job_title             text,
  status                text not null default 'invited'
                          check (status in ('invited', 'active', 'suspended', 'disabled')),
  is_super_admin        boolean not null default false,
  last_login_at         timestamptz,
  last_login_ip         inet,
  failed_login_attempts smallint not null default 0,
  locked_until          timestamptz,
  timezone              text not null default 'America/New_York',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index profiles_organization_id_idx on public.profiles (organization_id);
create index profiles_status_idx on public.profiles (status);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is 'Application user profile, one row per auth.users row.';

-- ---------------------------------------------------------------------------
-- roles: org-scoped (custom) or global system templates (organization_id null)
-- ---------------------------------------------------------------------------
create table public.roles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations (id) on delete cascade,
  name             text not null,
  slug             text not null,
  description      text,
  is_system        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint roles_org_slug_unique unique (organization_id, slug)
);

create index roles_organization_id_idx on public.roles (organization_id);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

comment on table public.roles is 'RBAC role. organization_id = null are system-wide templates cloned on org creation.';

-- ---------------------------------------------------------------------------
-- permissions: fine-grained capability catalog, grouped by module.
-- ---------------------------------------------------------------------------
create table public.permissions (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  module       text not null,
  label        text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create index permissions_module_idx on public.permissions (module);

comment on table public.permissions is 'Catalog of fine-grained permissions, e.g. claims.view, users.manage.';

-- ---------------------------------------------------------------------------
-- role_permissions: join table (many-to-many)
-- ---------------------------------------------------------------------------
create table public.role_permissions (
  role_id        uuid not null references public.roles (id) on delete cascade,
  permission_id  uuid not null references public.permissions (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index role_permissions_permission_id_idx on public.role_permissions (permission_id);

-- ---------------------------------------------------------------------------
-- user_roles: assigns a role to a user within an organization
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role_id          uuid not null references public.roles (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  assigned_by      uuid references public.profiles (id) on delete set null,
  assigned_at      timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_organization_id_idx on public.user_roles (organization_id);
create index user_roles_role_id_idx on public.user_roles (role_id);

comment on table public.user_roles is 'Assigns RBAC roles to a user, scoped to one organization.';

-- ---------------------------------------------------------------------------
-- invitations: invite-based onboarding flow (enterprise B2B pattern)
-- ---------------------------------------------------------------------------
create table public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  email            citext not null,
  role_id          uuid not null references public.roles (id) on delete restrict,
  invited_by       uuid references public.profiles (id) on delete set null,
  token_hash       text not null unique,
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at       timestamptz not null default (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index invitations_organization_id_idx on public.invitations (organization_id);
create index invitations_email_idx on public.invitations (email);
create unique index invitations_pending_email_org_idx
  on public.invitations (organization_id, email)
  where (status = 'pending');

comment on table public.invitations is 'Pending user invitations; token_hash is a sha256 of the emailed token, never the raw token.';
