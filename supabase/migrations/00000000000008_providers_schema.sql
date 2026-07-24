-- =============================================================================
-- Module 3: Providers
-- Migration 8: Provider roster + weekly schedule availability.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- providers: individual clinicians or billing/rendering groups on the roster.
-- ---------------------------------------------------------------------------
create table public.providers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  provider_type     text not null default 'individual' check (provider_type in ('individual', 'organization')),
  first_name        text,
  last_name         text,
  credential_suffix text,        -- e.g. "MD", "DO", "NP", "PA-C"
  organization_name text,        -- for provider_type = 'organization'
  npi               varchar(10) not null,
  tax_id            varchar(20),
  specialty         text not null,
  taxonomy_code     text,
  license_number    text,
  license_state     varchar(2),
  dea_number        text,
  email             citext,
  phone             text,
  status            text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint providers_org_npi_unique unique (organization_id, npi),
  constraint providers_individual_name check (
    provider_type <> 'individual' or (first_name is not null and last_name is not null)
  ),
  constraint providers_organization_name check (
    provider_type <> 'organization' or organization_name is not null
  )
);

create index providers_organization_id_idx on public.providers (organization_id);
create index providers_status_idx on public.providers (organization_id, status);
create index providers_specialty_idx on public.providers (organization_id, specialty);

create trigger providers_set_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

comment on table public.providers is 'Rendering/billing provider roster. Deep CAQH/PECOS credentialing workflows belong to the future Credentialing module - this table holds only the identifying fields Claims needs.';

-- ---------------------------------------------------------------------------
-- provider_schedules: simple recurring weekly availability, foundational for
-- the future Appointments module.
-- ---------------------------------------------------------------------------
create table public.provider_schedules (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.providers (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time    time not null,
  end_time      time not null,
  location      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint provider_schedules_time_order check (end_time > start_time)
);

create index provider_schedules_provider_id_idx on public.provider_schedules (provider_id);
create index provider_schedules_organization_id_idx on public.provider_schedules (organization_id);

create trigger provider_schedules_set_updated_at
  before update on public.provider_schedules
  for each row execute function public.set_updated_at();

comment on table public.provider_schedules is 'Recurring weekly availability blocks per provider.';
